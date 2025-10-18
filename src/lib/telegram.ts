export const globalSSEConnections = new Set<any>();

// 全局关闭状态，用于减少关闭时的日志噪音
let isAppShuttingDown = false;

export function setAppShuttingDown(shuttingDown: boolean) {
  isAppShuttingDown = shuttingDown;
}

export function broadcastMessage(message: any) {
  // 如果应用正在关闭，减少日志输出
  if (isAppShuttingDown) {
    return;
  }
  
  if (globalSSEConnections.size === 0) {
    // 减少关闭时的日志噪音，只在非关闭状态下输出
    if (message.type !== 'bot_status' || message.status !== 'stopped') {
      console.log('没有活跃的 SSE 连接');
    }
    return;
  }
  
  const data = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...message
  });
  
  // 减少关闭时的日志输出
  if (message.type !== 'bot_status' || message.status !== 'stopped') {
    console.log(`广播消息到 ${globalSSEConnections.size} 个连接:`, message.type);
  }
  
  globalSSEConnections.forEach(connection => {
    try {
      connection.write(`data: ${data}\n\n`);
    } catch (error) {
      console.error('SSE 广播失败:', error);
      globalSSEConnections.delete(connection);
    }
  });
}