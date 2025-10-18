/**
 * 媒体库缓存功能测试
 * 
 * 使用方法：
 * 1. 确保已配置 Jellyfin 服务器
 * 2. 运行: npx tsx src/lib/tasks/__tests__/media-library.test.ts
 */

import {
  refreshMediaLibraryCache,
  findMediaItemByIdOrTitle,
  findMediaItemsBatch,
  getMediaLibraryCache,
} from '../media-library';
import { logger } from '../../logger';

/**
 * 测试工具函数：打印分隔线
 */
function printSeparator(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60) + '\n');
}

/**
 * 测试1: 刷新媒体库缓存
 */
async function testRefreshCache() {
  printSeparator('测试 1: 刷新媒体库缓存');
  
  try {
    await refreshMediaLibraryCache();
    const cache = getMediaLibraryCache();
    
    console.log('✅ 缓存刷新成功');
    console.log(`   - 缓存项数量: ${cache.items.length}`);
    console.log(`   - 最后更新时间: ${cache.lastUpdated?.toLocaleString('zh-CN')}`);
    
    if (cache.items.length > 0) {
      console.log('\n前 3 个媒体项示例:');
      cache.items.slice(0, 3).forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.Name}`);
        console.log(`   - ID: ${item.Id}`);
        console.log(`   - 类型: ${item.Type}`);
        console.log(`   - 原标题: ${item.OriginalTitle || 'N/A'}`);
        console.log(`   - 路径: ${item.Path || 'N/A'}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ 缓存刷新失败:', error);
    return false;
  }
}

/**
 * 测试2: 通过ID查找媒体项
 */
function testFindBySourceId() {
  printSeparator('测试 2: 通过 ID 查找媒体项');
  
  // 修改这些测试ID为你实际媒体库中存在的番号
  const testIds = ['SONE-543'];
  
  console.log(`测试 ID 列表: ${testIds.join(', ')}\n`);
  
  testIds.forEach(sourceId => {
    const result = findMediaItemByIdOrTitle(sourceId);
    if (result) {
      console.log(`✅ 找到媒体项 [${sourceId}]:`);
      console.log(`   - 名称: ${result.Name}`);
      console.log(`   - ID: ${result.Id}`);
      console.log(`   - 原标题: ${result.OriginalTitle || 'N/A'}`);
    } else {
      console.log(`⚠️  未找到媒体项 [${sourceId}]`);
    }
    console.log('');
  });
}

/**
 * 测试3: 通过标题查找媒体项
 */
function testFindByTitle() {
  printSeparator('测试 3: 通过标题查找媒体项');
  
  // 修改这些测试标题为你实际媒体库中存在的标题
  const testTitles = ['在爱人面前'];
  
  console.log(`测试标题列表: ${testTitles.join(', ')}\n`);
  
  testTitles.forEach(title => {
    const result = findMediaItemByIdOrTitle(undefined, title);
    if (result) {
      console.log(`✅ 找到媒体项 [${title}]:`);
      console.log(`   - 名称: ${result.Name}`);
      console.log(`   - ID: ${result.Id}`);
      console.log(`   - 类型: ${result.Type}`);
    } else {
      console.log(`⚠️  未找到包含标题 [${title}] 的媒体项`);
    }
    console.log('');
  });
}

/**
 * 测试4: 批量查找媒体项
 */
function testBatchFind() {
  printSeparator('测试 4: 批量查找媒体项');
  
  // 模拟数据库中的电影列表
  const mockMovieList = [
    { id: 'movie-1', number: 'SONE-543', title: '' },
  ];
  
  console.log('模拟电影列表:');
  mockMovieList.forEach(movie => {
    console.log(`  - ${movie.number}: ${movie.title}`);
  });
  console.log('');
  
  const results = findMediaItemsBatch(mockMovieList);
  
  console.log(`匹配结果: ${results.size} / ${mockMovieList.length} 个电影找到对应媒体项\n`);
  
  results.forEach((mediaItem, movieId) => {
    const movie = mockMovieList.find(m => m.id === movieId);
    console.log(`✅ [${movie?.number}] ${movie?.title}`);
    console.log(`   -> Jellyfin: ${mediaItem.Name}`);
    console.log(`   -> ID: ${mediaItem.Id}`);
    console.log('');
  });
  
  // 显示未匹配的项
  const unmatchedMovies = mockMovieList.filter(m => !results.has(m.id));
  if (unmatchedMovies.length > 0) {
    console.log('未匹配的电影:');
    unmatchedMovies.forEach(movie => {
      console.log(`  ⚠️  ${movie.number}: ${movie.title}`);
    });
  }
}

/**
 * 测试5: 缓存性能测试
 */
function testCachePerformance() {
  printSeparator('测试 5: 缓存性能测试');
  
  const testCount = 100;
  const testId = 'SSIS-001'; // 使用你媒体库中存在的ID
  
  console.log(`执行 ${testCount} 次查找操作...\n`);
  
  const startTime = Date.now();
  
  for (let i = 0; i < testCount; i++) {
    findMediaItemByIdOrTitle(testId);
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  const avgTime = duration / testCount;
  
  console.log(`✅ 性能测试完成`);
  console.log(`   - 总耗时: ${duration}ms`);
  console.log(`   - 平均每次: ${avgTime.toFixed(2)}ms`);
  console.log(`   - 每秒可查询: ${(1000 / avgTime).toFixed(0)} 次`);
}

/**
 * 测试6: 边界情况测试
 */
function testEdgeCases() {
  printSeparator('测试 6: 边界情况测试');
  
  console.log('1. 测试空参数:');
  let result = findMediaItemByIdOrTitle();
  console.log(`   结果: ${result === null ? '✅ 正确返回 null' : '❌ 应该返回 null'}\n`);
  
  console.log('2. 测试不存在的ID:');
  result = findMediaItemByIdOrTitle('XXXXX-999999');
  console.log(`   结果: ${result === null ? '✅ 正确返回 null' : '❌ 应该返回 null'}\n`);
  
  console.log('3. 测试不存在的标题:');
  result = findMediaItemByIdOrTitle(undefined, '这是一个不存在的超级长标题测试');
  console.log(`   结果: ${result === null ? '✅ 正确返回 null' : '❌ 应该返回 null'}\n`);
  
  console.log('4. 测试空数组批量查找:');
  const batchResult = findMediaItemsBatch([]);
  console.log(`   结果: ${batchResult.size === 0 ? '✅ 正确返回空 Map' : '❌ 应该返回空 Map'}\n`);
}

/**
 * 主测试函数
 */
async function runAllTests() {
  console.log('\n🚀 开始媒体库缓存功能测试\n');
  
  try {
    // 测试1: 刷新缓存（必须先执行）
    const cacheRefreshed = await testRefreshCache();
    
    if (!cacheRefreshed) {
      console.error('\n❌ 缓存刷新失败，无法继续后续测试');
      console.error('请确保:');
      console.error('  1. Jellyfin 服务器正在运行');
      console.error('  2. 数据库中已配置 mediaServerConfig');
      console.error('  3. 网络连接正常');
      return;
    }
    
    // 检查缓存是否有数据
    const cache = getMediaLibraryCache();
    if (cache.items.length === 0) {
      console.warn('\n⚠️  媒体库缓存为空，部分测试可能无法执行');
      console.warn('请确保 Jellyfin 媒体库中有电影数据');
    }
    
    // 测试2-6
    testFindBySourceId();
    testFindByTitle();
    testBatchFind();
    testCachePerformance();
    testEdgeCases();
    
    printSeparator('测试完成');
    console.log('✅ 所有测试执行完毕\n');
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error);
  }
}

// 执行测试
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { runAllTests };

