import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// CSV 解析函数
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // 转义的引号
        current += '"';
        i++;
      } else {
        // 切换引号状态
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // 字段分隔符
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

// 解析 CSV 值
function parseCsvValue(value: string, type: string = 'string'): any {
  if (value === '' || value === 'null' || value === undefined) {
    return null;
  }
  
  if (type === 'json') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  
  if (type === 'date') {
    try {
      const date = new Date(value);
      // 检查日期是否有效
      if (isNaN(date.getTime())) {
        return null;
      }
      return date;
    } catch {
      return null;
    }
  }
  
  if (type === 'number') {
    return Number(value);
  }
  
  return value;
}

// 读取 CSV 文件
function readCsvFile(filePath: string): Array<any> {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return [];
  }
  
  const headers = parseCsvLine(lines[0]);
  const data: Array<any> = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const obj: any = {};
    
    headers.forEach((header, index) => {
      obj[header] = values[index] || null;
    });
    
    data.push(obj);
  }
  
  return data;
}

async function importData(exportDir?: string) {
  console.log('📥 开始从 CSV 导入数据...\n');

  try {
    // 确定导出目录
    const baseDir = exportDir || path.join(process.cwd(), 'prisma', 'export');
    
    if (!fs.existsSync(baseDir)) {
      console.error(`❌ 导出目录不存在: ${baseDir}`);
      console.log('请先运行: pnpm run export:data');
      process.exit(1);
    }

    // 查找最新的导出文件
    const files = fs.readdirSync(baseDir);
    const metadataFiles = files.filter(f => f.startsWith('metadata_') && f.endsWith('.json'));
    
    if (metadataFiles.length === 0) {
      console.error('❌ 未找到导出的元数据文件');
      process.exit(1);
    }

    // 使用最新的元数据文件
    const latestMetadata = metadataFiles.sort().reverse()[0];
    const metadataPath = path.join(baseDir, latestMetadata);
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

    console.log(`📋 使用导出数据: ${metadata.exportDate}`);
    console.log(`   - Subscribe: ${metadata.subscribeCount} 条`);
    console.log(`   - Movie: ${metadata.movieCount} 条\n`);

    const subscribeFile = path.join(baseDir, metadata.files.subscribe);
    const movieFile = path.join(baseDir, metadata.files.movie);

    // 1. 导入 Subscribe 数据
    console.log('📥 步骤 1: 导入 Subscribe 数据...');
    const subscribes = readCsvFile(subscribeFile);
    
    let subscribeImported = 0;
    let subscribeErrors = 0;
    for (const sub of subscribes) {
      try {
        const createdAt = parseCsvValue(sub.createdAt, 'date');
        const updatedAt = parseCsvValue(sub.updatedAt, 'date');
        
        await prisma.subscribe.create({
          data: {
            id: sub.id,
            filter: parseCsvValue(sub.filter, 'json'),
            createdAt: createdAt || new Date(), // 如果日期无效，使用当前时间
            updatedAt: updatedAt || new Date(),
            starInfo: parseCsvValue(sub.starInfo, 'json'),
            filterType: sub.filterType,
            filterValue: sub.filterValue
          }
        });
        subscribeImported++;
        
        if (subscribeImported % 10 === 0) {
          console.log(`   进度: ${subscribeImported}/${subscribes.length}`);
        }
      } catch (error: any) {
        subscribeErrors++;
        console.error(`   ❌ 导入 Subscribe 失败 (${sub.id}): ${error.message}`);
      }
    }
    console.log(`   ✅ 已导入 ${subscribeImported} 条 Subscribe 记录`);
    if (subscribeErrors > 0) {
      console.log(`   ⚠️  ${subscribeErrors} 条记录导入失败\n`);
    } else {
      console.log();
    }

    // 2. 导入 Movie 数据并处理重复
    console.log('📥 步骤 2: 导入 Movie 数据（合并重复）...');
    const movies = readCsvFile(movieFile);
    
    // 按 number 分组
    const moviesByNumber = new Map<string, Array<any>>();
    movies.forEach(movie => {
      if (!moviesByNumber.has(movie.number)) {
        moviesByNumber.set(movie.number, []);
      }
      moviesByNumber.get(movie.number)!.push(movie);
    });

    console.log(`   发现 ${moviesByNumber.size} 个唯一番号`);
    
    let movieImported = 0;
    let relationCreated = 0;
    const duplicateCount = movies.length - moviesByNumber.size;
    
    if (duplicateCount > 0) {
      console.log(`   将合并 ${duplicateCount} 个重复记录\n`);
    }

    for (const [number, movieList] of moviesByNumber.entries()) {
      // 选择最新更新的记录作为主记录
      const primaryMovie = movieList.reduce((latest, current) => {
        const latestDate = new Date(latest.updatedAt || latest.createdAt);
        const currentDate = new Date(current.updatedAt || current.createdAt);
        return currentDate > latestDate ? current : latest;
      });

      // 收集所有相关的 subscribeId
      const subscribeIds = new Set(
        movieList
          .map(m => m.subscribeId)
          .filter((id): id is string => id && id !== 'null' && id !== '')
      );

      try {
        // 解析日期字段
        const createdAt = parseCsvValue(primaryMovie.createdAt, 'date');
        const updatedAt = parseCsvValue(primaryMovie.updatedAt, 'date');
        const addedAt = parseCsvValue(primaryMovie.addedAt, 'date');
        const downloadAt = parseCsvValue(primaryMovie.downloadAt, 'date');
        
        // 创建唯一的 Movie 记录
        const createdMovie = await prisma.movie.create({
          data: {
            id: primaryMovie.id,
            number: primaryMovie.number,
            title: primaryMovie.title,
            cover: parseCsvValue(primaryMovie.cover),
            poster: parseCsvValue(primaryMovie.poster),
            date: parseCsvValue(primaryMovie.date),
            tags: parseCsvValue(primaryMovie.tags, 'json'),
            status: primaryMovie.status,
            createdAt: createdAt || new Date(), // 如果日期无效，使用当前时间
            updatedAt: updatedAt || new Date(),
            detail: parseCsvValue(primaryMovie.detail, 'json'),
            magnets: parseCsvValue(primaryMovie.magnets, 'json'),
            mediaLibrary: parseCsvValue(primaryMovie.mediaLibrary, 'json'),
            addedAt: addedAt,
            downloadAt: downloadAt
          }
        });

        movieImported++;

        // 为每个 subscribeId 创建关系
        for (const subscribeId of subscribeIds) {
          try {
            // 使用原始 SQL 插入，避免 Prisma Client 类型问题
            await prisma.$executeRaw`
              INSERT INTO "SubscribeMovie" ("id", "subscribeId", "movieId", "createdAt")
              VALUES (gen_random_uuid(), ${subscribeId}, ${createdMovie.id}, CURRENT_TIMESTAMP)
              ON CONFLICT ("subscribeId", "movieId") DO NOTHING
            `;
            relationCreated++;
          } catch (error: any) {
            console.warn(`   ⚠️  创建关系失败 (Subscribe: ${subscribeId}, Movie: ${createdMovie.id})`);
          }
        }

        if (movieImported % 10 === 0) {
          console.log(`   进度: ${movieImported}/${moviesByNumber.size}`);
        }
      } catch (error: any) {
        console.error(`   ❌ 导入电影失败 (${number}):`, error.message);
      }
    }

    console.log(`   ✅ 已导入 ${movieImported} 条 Movie 记录`);
    console.log(`   ✅ 已创建 ${relationCreated} 个订阅关系\n`);

    // 3. 验证导入结果
    console.log('✅ 步骤 3: 验证导入结果...');
    const finalMovieCount = await prisma.movie.count();
    const finalSubscribeCount = await prisma.subscribe.count();
    const finalRelationCountResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "SubscribeMovie"
    `;
    const finalRelationCount = Number(finalRelationCountResult[0].count);

    console.log(`   - Subscribe: ${finalSubscribeCount} 条`);
    console.log(`   - Movie: ${finalMovieCount} 条 (原始: ${movies.length} 条)`);
    console.log(`   - SubscribeMovie: ${finalRelationCount} 条\n`);

    console.log('🎉 数据导入完成！\n');
    console.log('后续步骤:');
    console.log('  1. 运行验证: pnpm run verify:migration');
    console.log('  2. 测试应用: pnpm dev');
    console.log('  3. 确认无误后可删除导出文件');

  } catch (error) {
    console.error('\n❌ 导入失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 执行导入
const exportDir = process.argv[2]; // 可选：指定导出目录
importData(exportDir)
  .then(() => {
    console.log('\n✨ 导入脚本执行完毕');
    process.exit(0);
  })
  .catch((error) => {
    console.error('导入脚本执行失败:', error);
    process.exit(1);
  });

