import { NextRequest, NextResponse } from "next/server";
import { sseManager } from "@/lib/sse-manager";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  

  if (!taskId) {
    return NextResponse.json({ message: "缺少任务ID" }, { status: 400 });
  }

  console.log(`[SSE API] 客户端请求连接任务: ${taskId}`);

  // 创建一个可以持续推送数据的流
  const stream = new ReadableStream({
    start(controller) {
      console.log(`[SSE API] Connection opened for task: ${taskId}. Registering client.`);

      // 将控制器添加到管理器中，以便其他地方可以推送消息
      sseManager.addClient(taskId, controller);

      // 当客户端断开连接时（例如关闭浏览器标签页），从管理器中移除
      request.signal.addEventListener("abort", () => {
        console.log(`[SSE API] Client disconnected for task: ${taskId}. Cleaning up.`);
        sseManager.removeClient(taskId);
      });
    },
    cancel() {
      // 当流被任何其他方式取消时
      console.log(`[SSE API] Stream cancelled for task: ${taskId}`);
      sseManager.removeClient(taskId);
    }
  });

  // 返回一个带有特定头部的 Response 对象，以表明这是一个 SSE 流
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}