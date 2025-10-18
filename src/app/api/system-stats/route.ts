import { logger } from "@/lib/logger";
import { getCpuUsage, getMemoryUsage } from "@/lib/system-stats";

// 告诉 Next.js 这是一个动态路由，不要缓存
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  
  // 创建一个可读流来发送数据
  const stream = new ReadableStream({
    start(controller) {
      
      // 设置一个定时器，每 2 秒发送一次数据
      const intervalId = setInterval(async () => {
        try {
          const cpuUsage = await getCpuUsage();
          const memoryUsage = getMemoryUsage();
          
          const data = {
            cpu: cpuUsage,
            memory: {
              used: (memoryUsage.used / 1024 / 1024).toFixed(2), // MB
              usedPercent: memoryUsage.usedPercent,
            },
            timestamp: Date.now(),
          };

          
          // 格式化为 SSE 消息格式: "data: {JSON}\n\n"
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(new TextEncoder().encode(message));
        } catch (error) {
          logger.error(`System-stats API: Error fetching stats:${error}`, );
          // 发送错误消息
          const errorMessage = `data: ${JSON.stringify({ error: 'Failed to fetch system stats' })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorMessage));
        }
      }, 2000);

      // 当客户端断开连接时，清理定时器
      request.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        controller.close();
      });
    },
  });

  // 返回流式响应
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}