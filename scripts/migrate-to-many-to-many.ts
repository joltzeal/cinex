import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface OldMovie {
  id: string;
  subscribeId: string | null;
  number: string;
  title: string;
  cover: string | null;
  poster: string | null;
  date: string | null;
  tags: any;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  detail: any;
  magnets: any;
  mediaLibrary: any;
  addedAt: Date | null;
  downloadAt: Date | null;
}

async function migrateToManyToMany() {
  console.log('🚀 开始数据迁移：一对多 -> 多对多');

  try {
    // 1. 读取所有现有的 Movie 数据（旧结构）
    console.log('\n📖 步骤 1: 读取现有电影数据...');
    const oldMovies = await prisma.$queryRaw<OldMovie[]>`
      SELECT * FROM "Movie" ORDER BY "createdAt" DESC
    `;
    console.log(`   找到 ${oldMovies.length} 条电影记录`);

    if (oldMovies.length === 0) {
      console.log('   没有数据需要迁移');
      return;
    }

    // 2. 按 number 分组，准备合并重复的电影
    console.log('\n🔍 步骤 2: 分析和合并重复电影...');
    const moviesByNumber = new Map<string, OldMovie[]>();
    
    for (const movie of oldMovies) {
      if (!moviesByNumber.has(movie.number)) {
        moviesByNumber.set(movie.number, []);
      }
      moviesByNumber.get(movie.number)!.push(movie);
    }

    console.log(`   发现 ${moviesByNumber.size} 个唯一番号`);
    
    // 统计重复情况
    let duplicateCount = 0;
    moviesByNumber.forEach((movies, number) => {
      if (movies.length > 1) {
        duplicateCount++;
        console.log(`   - 番号 ${number}: ${movies.length} 条记录将被合并`);
      }
    });
    console.log(`   共有 ${duplicateCount} 个番号存在重复`);

    // 3. 备份数据到临时表
    console.log('\n💾 步骤 3: 创建数据备份...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Movie_backup" AS SELECT * FROM "Movie"
    `;
    console.log('   ✅ 数据已备份到 Movie_backup 表');

    // 4. 创建中间表（如果不存在）
    console.log('\n🔨 步骤 4: 创建 SubscribeMovie 中间表...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "SubscribeMovie" (
        "id" TEXT NOT NULL,
        "subscribeId" TEXT NOT NULL,
        "movieId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SubscribeMovie_pkey" PRIMARY KEY ("id")
      )
    `;
    console.log('   ✅ 中间表已创建');

    // 5. 处理每个唯一的 number，创建新的 Movie 记录和关系
    console.log('\n⚙️  步骤 5: 迁移数据到新结构...');
    
    let processedCount = 0;
    let relationCount = 0;

    for (const [number, movies] of moviesByNumber.entries()) {
      // 选择最新更新的电影作为主记录
      const primaryMovie = movies.reduce((latest, current) => 
        current.updatedAt > latest.updatedAt ? current : latest
      );

      // 收集所有相关的 subscribeId
      const subscribeIds = new Set(
        movies
          .map(m => m.subscribeId)
          .filter((id): id is string => id !== null)
      );

      try {
        // 删除旧的 Movie 记录
        await prisma.$executeRaw`
          DELETE FROM "Movie" WHERE "number" = ${number}
        `;

        // 创建新的 Movie 记录（不带 subscribeId）
        await prisma.$executeRaw`
          INSERT INTO "Movie" (
            "id", "number", "title", "cover", "poster", "date", 
            "tags", "status", "createdAt", "updatedAt", "detail", 
            "magnets", "mediaLibrary", "addedAt", "downloadAt"
          ) VALUES (
            ${primaryMovie.id}, ${primaryMovie.number}, ${primaryMovie.title},
            ${primaryMovie.cover}, ${primaryMovie.poster}, ${primaryMovie.date},
            ${primaryMovie.tags}::jsonb, ${primaryMovie.status}::text::"MovieStatus",
            ${primaryMovie.createdAt}, ${primaryMovie.updatedAt}, ${primaryMovie.detail}::jsonb,
            ${primaryMovie.magnets}::jsonb, ${primaryMovie.mediaLibrary}::jsonb,
            ${primaryMovie.addedAt}, ${primaryMovie.downloadAt}
          )
        `;

        // 为每个 subscribeId 创建关系记录
        for (const subscribeId of subscribeIds) {
          const relationId = `${subscribeId}-${primaryMovie.id}`;
          await prisma.$executeRaw`
            INSERT INTO "SubscribeMovie" ("id", "subscribeId", "movieId", "createdAt")
            VALUES (${relationId}, ${subscribeId}, ${primaryMovie.id}, CURRENT_TIMESTAMP)
            ON CONFLICT DO NOTHING
          `;
          relationCount++;
        }

        processedCount++;
        if (processedCount % 10 === 0) {
          console.log(`   处理进度: ${processedCount}/${moviesByNumber.size}`);
        }
      } catch (error) {
        console.error(`   ❌ 处理番号 ${number} 时出错:`, error);
        throw error;
      }
    }

    console.log(`   ✅ 已处理 ${processedCount} 个唯一电影`);
    console.log(`   ✅ 已创建 ${relationCount} 个订阅关系`);

    // 6. 更新表结构
    console.log('\n🔧 步骤 6: 更新表结构...');
    
    // 删除旧的外键约束
    await prisma.$executeRaw`
      ALTER TABLE "Movie" DROP CONSTRAINT IF EXISTS "Movie_subscribeId_fkey"
    `;
    console.log('   ✅ 已删除旧的外键约束');

    // 删除旧的唯一约束
    await prisma.$executeRaw`
      DROP INDEX IF EXISTS "Movie_subscribeId_number_key"
    `;
    console.log('   ✅ 已删除旧的唯一约束');

    // 删除旧的索引
    await prisma.$executeRaw`
      DROP INDEX IF EXISTS "Movie_subscribeId_idx"
    `;
    console.log('   ✅ 已删除旧的索引');

    // 删除 subscribeId 列
    await prisma.$executeRaw`
      ALTER TABLE "Movie" DROP COLUMN IF EXISTS "subscribeId"
    `;
    console.log('   ✅ 已删除 subscribeId 列');

    // 为 number 添加唯一约束
    await prisma.$executeRaw`
      ALTER TABLE "Movie" ADD CONSTRAINT "Movie_number_key" UNIQUE ("number")
    `;
    console.log('   ✅ 已为 number 添加唯一约束');

    // 为中间表添加约束和索引
    await prisma.$executeRaw`
      ALTER TABLE "SubscribeMovie" 
      ADD CONSTRAINT "SubscribeMovie_subscribeId_movieId_key" 
      UNIQUE ("subscribeId", "movieId")
    `;
    console.log('   ✅ 已为中间表添加唯一约束');

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "SubscribeMovie_subscribeId_idx" 
      ON "SubscribeMovie"("subscribeId")
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "SubscribeMovie_movieId_idx" 
      ON "SubscribeMovie"("movieId")
    `;
    console.log('   ✅ 已为中间表添加索引');

    // 添加外键约束
    await prisma.$executeRaw`
      ALTER TABLE "SubscribeMovie" 
      ADD CONSTRAINT "SubscribeMovie_subscribeId_fkey" 
      FOREIGN KEY ("subscribeId") REFERENCES "Subscribe"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `;
    await prisma.$executeRaw`
      ALTER TABLE "SubscribeMovie" 
      ADD CONSTRAINT "SubscribeMovie_movieId_fkey" 
      FOREIGN KEY ("movieId") REFERENCES "Movie"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `;
    console.log('   ✅ 已为中间表添加外键约束');

    // 7. 验证数据
    console.log('\n✅ 步骤 7: 验证迁移结果...');
    const newMovieCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "Movie"
    `;
    const relationshipCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "SubscribeMovie"
    `;
    
    console.log(`   电影记录数: ${newMovieCount[0].count}`);
    console.log(`   关系记录数: ${relationshipCount[0].count}`);

    console.log('\n🎉 数据迁移完成！');
    console.log('\n📝 注意事项：');
    console.log('   1. 原始数据已备份到 Movie_backup 表');
    console.log('   2. 如果迁移成功，可以删除备份表: DROP TABLE "Movie_backup"');
    console.log('   3. 请测试应用程序功能是否正常');
    console.log('   4. 确认无误后运行: npx prisma generate 重新生成 Prisma Client');

  } catch (error) {
    console.error('\n❌ 迁移失败:', error);
    console.log('\n🔄 回滚建议：');
    console.log('   如果需要回滚，可以从 Movie_backup 表恢复数据');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 执行迁移
migrateToManyToMany()
  .then(() => {
    console.log('\n✨ 迁移脚本执行完毕');
    process.exit(0);
  })
  .catch((error) => {
    console.error('迁移脚本执行失败:', error);
    process.exit(1);
  });

