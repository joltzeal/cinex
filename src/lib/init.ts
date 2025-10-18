// 应用初始化模块
// 在服务器启动时执行必要的初始化操作

// import { autoStartBotOnAppStart } from './bot-manager';

// 防止重复初始化
let isInitialized = false;

export async function initializeApp() {
  if (isInitialized) {
    console.log('应用已经初始化，跳过重复初始化');
    return;
  }

  console.log('🚀 开始初始化应用...');

  try {
    // 自动启动Bot服务（根据数据库配置）
    // await autoStartBotOnAppStart();

    // 这里可以添加其他初始化任务
    // 例如：定时任务、缓存预热等

    isInitialized = true;
    console.log('✅ 应用初始化完成');

  } catch (error) {
    console.error('❌ 应用初始化失败:', error);
    // 不要抛出错误，避免影响应用启动
  }
}

// 在模块加载时自动执行初始化
// 只在服务器端执行
// if (typeof window === 'undefined') {
//   // 使用 setTimeout 确保在下一个事件循环中执行
//   // 避免在模块加载阶段阻塞其他模块
//   setTimeout(() => {
//     initializeApp().catch(console.error);
//   }, 100);
// }

export default initializeApp;
