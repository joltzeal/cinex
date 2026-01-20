import { SseMessage } from "@/types/download";

class SseManager {
  // 使用 Map 存储每个任务的 SSE 控制器
  // key: taskId (string), value: controller (ReadableStreamDefaultController)
  private clients = new Map<string, ReadableStreamDefaultController>();

  // 添加消息队列，用于存储客户端连接前的消息
  private messageQueues = new Map<string, SseMessage[]>();

  /**
   * 当一个SSE连接建立时，添加一个新的客户端控制器。
   * @param taskId 任务ID
   * @param controller SSE流控制器
   */
  addClient(taskId: string, controller: ReadableStreamDefaultController) {
    this.clients.set(taskId, controller);
    console.log(`[SSE Manager] Client registered for task: ${taskId}. Current clients: ${Array.from(this.clients.keys()).join(', ')}`);
    
    // Immediately send any messages that were queued before the client connected.
    this.flushMessageQueue(taskId);
  }

  // 检查是否有客户端连接
  hasClient(taskId: string): boolean {
    return this.clients.has(taskId);
  }

  /**
   * 当连接关闭或出错时，移除一个客户端并清理相关资源。
   * @param taskId 任务ID
   */
  removeClient(taskId: string) {
    if (this.clients.has(taskId)) {
      try {
        this.clients.get(taskId)?.close();
      } catch (e) {
        // Ignore errors if the controller is already closed.
      }
      this.clients.delete(taskId);
      this.messageQueues.delete(taskId);
      console.log(`[SSE Manager] Client removed for task: ${taskId}.`);
    }
  }

  /**
   * 向指定任务的客户端发送消息。
   * 如果客户端已连接，则直接发送；否则，将消息放入队列。
   * @param taskId 任务ID
   * @param data 要发送的消息
   */
  emit(taskId: string, data: SseMessage) {
    const controller = this.clients.get(taskId);
    if (controller) {
      // Client is connected, send the message directly.
      try {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(new TextEncoder().encode(message));
        console.log(`[SSE Manager] Sent message '${data.stage}' to task: ${taskId}`);
      } catch (error) {
        console.error(`[SSE Manager] Error sending message to ${taskId}. Removing client.`, error);
        this.removeClient(taskId);
      }
    } else {
      // Client has not connected yet, queue the message.
      // console.log(`[SSE Manager] Client not found for task: ${taskId}. Queuing message: '${data.stage}'`);
      this.queueMessage(taskId, data);
    }
  }


  /**
   * 将消息加入对应任务的队列中。
   * @param taskId 任务ID
   * @param data 要排队的消息
   */
  private queueMessage(taskId: string, data: SseMessage) {
    if (!this.messageQueues.has(taskId)) {
      this.messageQueues.set(taskId, []);
    }
    this.messageQueues.get(taskId)!.push(data);
  }

  /**
   * 发送指定任务队列中的所有消息。
   * @param taskId 任务ID
   */
  private flushMessageQueue(taskId: string) {
    const queue = this.messageQueues.get(taskId);
    const controller = this.clients.get(taskId);

    if (queue && queue.length > 0 && controller) {
      console.log(`[SSE Manager] Flushing ${queue.length} queued messages for task: ${taskId}`);
      for (const data of queue) {
        this.emit(taskId, data); // Use emit to send for consistency
      }
      // Clear the queue after flushing
      this.messageQueues.delete(taskId);
    }
  }


}

// 导出一个单例，确保整个应用中只有一个管理器实例
export const sseManager = new SseManager();