import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyMigration() {
  console.log('🔍 开始验证迁移结果...\n');

  try {
    // 1. 检查 Movie 表的 number 唯一性
    console.log('📋 检查 1: Movie 表 number 字段唯一性');
    const duplicateNumbers = await prisma.$queryRaw<Array<{ number: string; count: bigint }>>`
      SELECT "number", COUNT(*) as count
      FROM "Movie"
      GROUP BY "number"
      HAVING COUNT(*) > 1
    `;

    if (duplicateNumbers.length > 0) {
      console.log('   ❌ 发现重复的番号:');
      duplicateNumbers.forEach(({ number, count }) => {
        console.log(`      - ${number}: ${count} 条记录`);
      });
    } else {
      console.log('   ✅ 所有番号唯一\n');
    }

    // 2. 统计数据
    console.log('📊 数据统计:');
    const movieCountResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "Movie"
    `;
    const subscribeCountResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "Subscribe"
    `;
    const relationCountResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "SubscribeMovie"
    `;

    console.log(`   - Movie 记录数: ${movieCountResult[0].count}`);
    console.log(`   - Subscribe 记录数: ${subscribeCountResult[0].count}`);
    console.log(`   - SubscribeMovie 关系数: ${relationCountResult[0].count}\n`);

    // 3. 检查孤立的记录
    console.log('🔗 检查 3: 孤立记录检测');
    
    // 检查没有任何订阅关系的电影
    const orphanMovies = await prisma.$queryRaw<Array<{ id: string; number: string; title: string }>>`
      SELECT m.id, m.number, m.title
      FROM "Movie" m
      LEFT JOIN "SubscribeMovie" sm ON m.id = sm."movieId"
      WHERE sm.id IS NULL
    `;

    if (orphanMovies.length > 0) {
      console.log(`   ⚠️  发现 ${orphanMovies.length} 个没有订阅关系的电影:`);
      orphanMovies.slice(0, 5).forEach(movie => {
        console.log(`      - ${movie.number}: ${movie.title}`);
      });
      if (orphanMovies.length > 5) {
        console.log(`      ... 还有 ${orphanMovies.length - 5} 个`);
      }
      console.log();
    } else {
      console.log('   ✅ 所有电影都有订阅关系\n');
    }

    // 4. 检查关系完整性
    console.log('🔗 检查 4: 关系完整性');
    
    // 检查中间表中是否有无效的订阅ID
    const invalidSubscribeRelations = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM "SubscribeMovie" sm
      LEFT JOIN "Subscribe" s ON sm."subscribeId" = s.id
      WHERE s.id IS NULL
    `;

    // 检查中间表中是否有无效的电影ID
    const invalidMovieRelations = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM "SubscribeMovie" sm
      LEFT JOIN "Movie" m ON sm."movieId" = m.id
      WHERE m.id IS NULL
    `;

    const invalidSubCount = Number(invalidSubscribeRelations[0].count);
    const invalidMovieCount = Number(invalidMovieRelations[0].count);

    if (invalidSubCount > 0) {
      console.log(`   ❌ 发现 ${invalidSubCount} 个无效的订阅关系`);
    }
    if (invalidMovieCount > 0) {
      console.log(`   ❌ 发现 ${invalidMovieCount} 个无效的电影关系`);
    }
    if (invalidSubCount === 0 && invalidMovieCount === 0) {
      console.log('   ✅ 所有关系都有效\n');
    }

    // 5. 检查重复关系
    console.log('🔗 检查 5: 重复关系检测');
    const duplicateRelations = await prisma.$queryRaw<Array<{ subscribeId: string; movieId: string; count: bigint }>>`
      SELECT "subscribeId", "movieId", COUNT(*) as count
      FROM "SubscribeMovie"
      GROUP BY "subscribeId", "movieId"
      HAVING COUNT(*) > 1
    `;

    if (duplicateRelations.length > 0) {
      console.log(`   ❌ 发现 ${duplicateRelations.length} 个重复关系`);
      duplicateRelations.slice(0, 3).forEach(rel => {
        console.log(`      - Subscribe: ${rel.subscribeId}, Movie: ${rel.movieId} (${rel.count} 次)`);
      });
    } else {
      console.log('   ✅ 没有重复关系\n');
    }

    // 6. 检查备份表
    console.log('💾 检查 6: 备份表');
    try {
      const backupCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM "Movie_backup"
      `;
      console.log(`   ✅ 备份表存在，包含 ${backupCount[0].count} 条记录`);
      console.log('   💡 确认迁移成功后可以删除备份表\n');
    } catch (error) {
      console.log('   ℹ️  备份表不存在（可能已删除）\n');
    }

    // 7. 采样测试
    console.log('🎯 检查 7: 采样验证');
    const sampleSubscribes = await prisma.$queryRaw<Array<{
      id: string;
      filterValue: string;
      movieCount: bigint;
    }>>`
      SELECT s.id, s."filterValue", COUNT(sm.id) as "movieCount"
      FROM "Subscribe" s
      LEFT JOIN "SubscribeMovie" sm ON s.id = sm."subscribeId"
      GROUP BY s.id, s."filterValue"
      LIMIT 3
    `;

    console.log(`   测试 ${sampleSubscribes.length} 个订阅的查询:`);
    for (const sub of sampleSubscribes) {
      console.log(`   - 订阅 ${sub.filterValue}: ${sub.movieCount} 个电影`);
      
      // 获取一个示例电影
      if (Number(sub.movieCount) > 0) {
        const sampleMovie = await prisma.$queryRaw<Array<{ number: string; title: string }>>`
          SELECT m.number, m.title
          FROM "Movie" m
          JOIN "SubscribeMovie" sm ON m.id = sm."movieId"
          WHERE sm."subscribeId" = ${sub.id}
          LIMIT 1
        `;
        if (sampleMovie.length > 0) {
          const movie = sampleMovie[0];
          const truncatedTitle = movie.title.length > 30 ? movie.title.substring(0, 30) + '...' : movie.title;
          console.log(`     示例: ${movie.number} - ${truncatedTitle}`);
        }
      }
    }
    console.log('   ✅ 查询功能正常\n');

    // 8. 性能检查
    console.log('⚡ 检查 8: 索引和性能');
    
    // 检查索引是否存在
    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'SubscribeMovie'
    `;
    
    console.log(`   找到 ${indexes.length} 个索引:`);
    indexes.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });

    const expectedIndexes = [
      'SubscribeMovie_pkey',
      'SubscribeMovie_subscribeId_movieId_key',
      'SubscribeMovie_subscribeId_idx',
      'SubscribeMovie_movieId_idx'
    ];

    const missingIndexes = expectedIndexes.filter(
      exp => !indexes.some(idx => idx.indexname === exp)
    );

    if (missingIndexes.length > 0) {
      console.log('   ⚠️  缺少索引:', missingIndexes.join(', '));
    } else {
      console.log('   ✅ 所有必要的索引都存在\n');
    }

    // 总结
    console.log('=' .repeat(50));
    console.log('📈 验证总结\n');

    const issues: string[] = [];
    
    if (duplicateNumbers.length > 0) {
      issues.push(`${duplicateNumbers.length} 个重复的番号`);
    }
    if (orphanMovies.length > 0) {
      issues.push(`${orphanMovies.length} 个孤立的电影`);
    }
    if (invalidSubCount > 0 || invalidMovieCount > 0) {
      issues.push('存在无效的关系记录');
    }
    if (duplicateRelations.length > 0) {
      issues.push(`${duplicateRelations.length} 个重复关系`);
    }
    if (missingIndexes.length > 0) {
      issues.push(`缺少 ${missingIndexes.length} 个索引`);
    }

    if (issues.length === 0) {
      console.log('🎉 验证通过！迁移成功完成，没有发现问题。\n');
      console.log('后续步骤:');
      console.log('1. 运行 npx prisma generate 重新生成客户端');
      console.log('2. 测试应用程序功能');
      console.log('3. 确认无误后删除备份表: DROP TABLE "Movie_backup"');
    } else {
      console.log('⚠️  发现以下问题:\n');
      issues.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue}`);
      });
      console.log('\n请检查并修复这些问题后再继续。');
    }

  } catch (error) {
    console.error('\n❌ 验证过程中发生错误:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 执行验证
verifyMigration()
  .then(() => {
    console.log('\n✨ 验证完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('验证失败:', error);
    process.exit(1);
  });

