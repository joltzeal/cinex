export async function register() {
  // 确保只在 Node.js 服务端运行时执行 (Next.js 还有 Edge Runtime，那里不支持 node-cron)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    
    // 动态导入调度器，避免在构建阶段或非 Node 环境加载依赖
    // 注意：这里路径要指向上面创建的 scheduler.ts
    const { startScheduler } = await import('@/lib/cron');
    
    // 启动任务
    startScheduler();
  }
}