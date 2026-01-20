import { globalSSEConnections } from '@/lib/telegram';
import { NextRequest } from 'next/server';


export async function GET(request: NextRequest) {
  // 设置 SSE 响应头
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  // 创建一个可读流
  const stream = new ReadableStream({
    start(controller) {
      // 发送初始连接消息
      const initialMessage = `data: ${JSON.stringify({
        type: 'connection',
        message: 'SSE 连接已建立',
        timestamp: new Date().toISOString()
      })}\n\n`;
      
      controller.enqueue(new TextEncoder().encode(initialMessage));

      // 创建一个写入器来模拟 response.write
      const writer = {
        write: (data: string) => {
          try {
            controller.enqueue(new TextEncoder().encode(data));
          } catch (error) {
            console.error('SSE 写入失败:', error);
          }
        }
      };

      // 将连接添加到全局连接集合
      globalSSEConnections.add(writer);

      // 定期发送心跳
      const heartbeat = setInterval(() => {
        try {
          const heartbeatMessage = `data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(heartbeatMessage));
        } catch (error) {
          console.error('发送心跳失败:', error);
          clearInterval(heartbeat);
          globalSSEConnections.delete(writer);
        }
      }, 30000); // 每30秒发送一次心跳

      // 处理连接关闭
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        globalSSEConnections.delete(writer);
        console.log(`SSE 连接已关闭，当前连接数: ${globalSSEConnections.size}`);
        try {
          controller.close();
        } catch (error) {
          // 忽略关闭时的错误
        }
      });
    },
  });

  return new Response(stream, { headers });
}