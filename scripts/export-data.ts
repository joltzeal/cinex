import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// CSV 转义函数
function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const str = String(value);
  // 如果包含逗号、引号或换行符，需要用引号包裹并转义内部引号
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// 将对象转换为 CSV 行
function objectToCsvRow(obj: any, headers: string[]): string {
  return headers.map(header => {
    const value = obj[header];
    // JSON 字段需要序列化
    if (value !== null && value !== undefined && typeof value === 'object') {
      return escapeCsvValue(JSON.stringify(value));
    }
    // Date 字段转换为 ISO 字符串
    if (value instanceof Date) {
      return escapeCsvValue(value.toISOString());
    }
    return escapeCsvValue(value);
  }).join(',');
}

async function exportData() {
  console.log('📦 开始导出数据到 CSV...\n');

  try {
    // 创建导出目录
    const exportDir = path.join(process.cwd(), 'prisma', 'export');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    
    // 1. 导出 Subscribe 表
    console.log('📋 导出 Subscribe 表...');
    const subscribes = await prisma.$queryRaw<Array<any>>`
      SELECT * FROM "Subscribe" ORDER BY "createdAt"
    `;
    
    if (subscribes.length > 0) {
      const subscribeHeaders = Object.keys(subscribes[0]);
      const subscribeFile = path.join(exportDir, `subscribe_${timestamp}.csv`);
      
      let subscribeCsv = subscribeHeaders.join(',') + '\n';
      subscribes.forEach(sub => {
        subscribeCsv += objectToCsvRow(sub, subscribeHeaders) + '\n';
      });
      
      fs.writeFileSync(subscribeFile, subscribeCsv, 'utf8');
      console.log(`   ✅ 导出 ${subscribes.length} 条 Subscribe 记录`);
      console.log(`   📁 文件: ${subscribeFile}\n`);
    } else {
      console.log('   ℹ️  Subscribe 表为空\n');
    }

    // 2. 导出 Movie 表
    console.log('📋 导出 Movie 表...');
    const movies = await prisma.$queryRaw<Array<any>>`
      SELECT * FROM "Movie" ORDER BY "createdAt"
    `;
    
    if (movies.length > 0) {
      const movieHeaders = Object.keys(movies[0]);
      const movieFile = path.join(exportDir, `movie_${timestamp}.csv`);
      
      let movieCsv = movieHeaders.join(',') + '\n';
      movies.forEach(movie => {
        movieCsv += objectToCsvRow(movie, movieHeaders) + '\n';
      });
      
      fs.writeFileSync(movieFile, movieCsv, 'utf8');
      console.log(`   ✅ 导出 ${movies.length} 条 Movie 记录`);
      console.log(`   📁 文件: ${movieFile}\n`);
    } else {
      console.log('   ℹ️  Movie 表为空\n');
    }

    // 3. 创建元数据文件
    const metadata = {
      exportDate: new Date().toISOString(),
      subscribeCount: subscribes.length,
      movieCount: movies.length,
      files: {
        subscribe: `subscribe_${timestamp}.csv`,
        movie: `movie_${timestamp}.csv`
      }
    };

    const metadataFile = path.join(exportDir, `metadata_${timestamp}.json`);
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2), 'utf8');
    
    console.log('📊 导出统计:');
    console.log(`   - Subscribe: ${subscribes.length} 条`);
    console.log(`   - Movie: ${movies.length} 条`);
    console.log(`   - 导出目录: ${exportDir}\n`);

    // 4. 分析重复情况
    console.log('🔍 分析数据...');
    if (movies.length > 0) {
      const numberCount = new Map<string, number>();
      movies.forEach(movie => {
        const count = numberCount.get(movie.number) || 0;
        numberCount.set(movie.number, count + 1);
      });

      const duplicates = Array.from(numberCount.entries())
        .filter(([_, count]) => count > 1)
        .sort((a, b) => b[1] - a[1]);

      if (duplicates.length > 0) {
        console.log(`   ⚠️  发现 ${duplicates.length} 个重复的番号:`);
        duplicates.slice(0, 5).forEach(([number, count]) => {
          console.log(`      - ${number}: ${count} 条记录`);
        });
        if (duplicates.length > 5) {
          console.log(`      ... 还有 ${duplicates.length - 5} 个`);
        }
        console.log(`   💡 迁移后这些重复将被合并为唯一记录\n`);
      } else {
        console.log('   ✅ 没有发现重复的番号\n');
      }
    }

    console.log('🎉 数据导出完成！\n');
    console.log('后续步骤:');
    console.log('  1. 检查导出的 CSV 文件');
    console.log('  2. 运行 Prisma 迁移: npx prisma migrate dev');
    console.log('  3. 运行数据导入: pnpm run import:data');

    return { exportDir, subscribes, movies };

  } catch (error) {
    console.error('\n❌ 导出失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 执行导出
exportData()
  .then(() => {
    console.log('\n✨ 导出脚本执行完毕');
    process.exit(0);
  })
  .catch((error) => {
    console.error('导出脚本执行失败:', error);
    process.exit(1);
  });

