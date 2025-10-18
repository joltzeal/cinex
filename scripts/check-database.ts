import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('🔍 检查数据库状态...\n');

  try {
    // 1. 检查 Subscribe 表
    const subscribeCount = await prisma.subscribe.count();
    console.log(`📋 Subscribe 表: ${subscribeCount} 条记录`);

    // 2. 检查 Movie 表
    const movieCount = await prisma.movie.count();
    console.log(`🎬 Movie 表: ${movieCount} 条记录`);

    // 3. 检查 SubscribeMovie 中间表
    const relationCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "SubscribeMovie"
    `;
    console.log(`🔗 SubscribeMovie 中间表: ${relationCount[0].count} 条关系记录\n`);

    // 4. 如果有 Subscribe，检查第一个订阅的详细信息
    if (subscribeCount > 0) {
      console.log('📊 检查第一个订阅的详细信息...');
      
      const firstSubscribe = await prisma.subscribe.findFirst({
        include: {
          movies: {
            include: {
              movie: true
            }
          }
        }
      });

      if (firstSubscribe) {
        console.log(`   订阅 ID: ${firstSubscribe.id}`);
        console.log(`   类型: ${firstSubscribe.filterType}`);
        console.log(`   值: ${firstSubscribe.filterValue}`);
        console.log(`   关联的电影数: ${firstSubscribe.movies.length}\n`);

        if (firstSubscribe.movies.length > 0) {
          console.log('   前3个电影:');
          firstSubscribe.movies.slice(0, 3).forEach((sm, index) => {
            console.log(`   ${index + 1}. ${sm.movie.number} - ${sm.movie.title}`);
          });
        } else {
          console.log('   ⚠️  此订阅没有关联的电影！');
        }
      }
    }

    console.log('\n---\n');

    // 5. 检查是否有旧的 subscribeId 字段
    console.log('🔍 检查 Movie 表结构...');
    const tableInfo = await prisma.$queryRaw<Array<any>>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Movie'
      ORDER BY ordinal_position
    `;

    console.log('   Movie 表字段:');
    tableInfo.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });

    const hasSubscribeId = tableInfo.some(col => col.column_name === 'subscribeId');
    if (hasSubscribeId) {
      console.log('\n   ❌ 警告: Movie 表仍然有 subscribeId 字段！');
      console.log('   这意味着数据库迁移可能还没有执行。');
      console.log('   请运行: npx prisma migrate dev\n');
    } else {
      console.log('\n   ✅ Movie 表结构正确（没有 subscribeId 字段）\n');
    }

    // 6. 检查 SubscribeMovie 表是否存在
    console.log('🔍 检查 SubscribeMovie 表是否存在...');
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename = 'SubscribeMovie'
    `;

    if (tables.length === 0) {
      console.log('   ❌ SubscribeMovie 表不存在！');
      console.log('   请先运行数据库迁移: npx prisma migrate dev\n');
    } else {
      console.log('   ✅ SubscribeMovie 表存在\n');
    }

    // 7. 如果中间表没有数据但有 Movie 和 Subscribe
    if (Number(relationCount[0].count) === 0 && subscribeCount > 0 && movieCount > 0) {
      console.log('⚠️  诊断结果:');
      console.log('   - Subscribe 表有数据');
      console.log('   - Movie 表有数据');
      console.log('   - 但 SubscribeMovie 中间表没有关系记录！\n');
      console.log('💡 可能的原因:');
      console.log('   1. 还没有运行数据导入脚本');
      console.log('   2. 旧的 Movie 记录有 subscribeId 字段，新结构没有\n');
      console.log('🔧 解决方案:');
      console.log('   选项1: 运行完整的安全迁移流程');
      console.log('           ./scripts/run-safe-migration.sh\n');
      console.log('   选项2: 如果已有旧数据，运行数据库内迁移');
      console.log('           pnpm run migrate:many-to-many\n');
      console.log('   选项3: 手动导入数据');
      console.log('           pnpm run export:data');
      console.log('           npx prisma migrate dev');
      console.log('           pnpm run import:data\n');
    }

    // 8. 检查是否有孤立的 Movie 记录
    const orphanMovies = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM "Movie" m
      LEFT JOIN "SubscribeMovie" sm ON m.id = sm."movieId"
      WHERE sm.id IS NULL
    `;

    if (Number(orphanMovies[0].count) > 0) {
      console.log(`⚠️  发现 ${orphanMovies[0].count} 个孤立的 Movie 记录（没有订阅关联）\n`);
    }

  } catch (error: any) {
    console.error('\n❌ 检查过程中出错:', error.message);
    
    if (error.message.includes('SubscribeMovie')) {
      console.log('\n💡 提示: SubscribeMovie 表可能不存在');
      console.log('   请先运行: npx prisma migrate dev\n');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase()
  .then(() => {
    console.log('✨ 检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });

