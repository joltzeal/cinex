export const globalSSEConnections = new Set<any>();

export function broadcastMessage(message: any) {
  if (globalSSEConnections.size === 0) {
    console.log('没有活跃的 SSE 连接');
    return;
  }
  
  const data = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...message
  });
  
  console.log(`广播消息到 ${globalSSEConnections.size} 个连接:`, message.type);
  
  globalSSEConnections.forEach(connection => {
    try {
      connection.write(`data: ${data}\n\n`);
    } catch (error) {
      console.error('SSE 广播失败:', error);
      globalSSEConnections.delete(connection);
    }
  });
}