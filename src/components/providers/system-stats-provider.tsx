"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface SystemStats {
  cpu: number;
  memory: {
    used: string;
    usedPercent: number;
  };
  timestamp: number;
}

const SystemStatsContext = createContext<SystemStats | null>(null);

export function SystemStatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<SystemStats | null>(null);

  useEffect(() => {
    // EventSource 构造函数接收 SSE 端点的 URL
    const eventSource = new EventSource('/api/system-stats');
    
    // 监听 'message' 事件
    eventSource.onmessage = (event) => {
      try {
        const newStats = JSON.parse(event.data);
        setStats(newStats);
      } catch (error) {
        console.error('SystemStatsProvider: Failed to parse message', error);
      }
    };
    
    // 监听连接打开事件
    eventSource.onopen = () => {
    };
    
    // 监听错误事件
    eventSource.onerror = (err) => {
      // 不要立即关闭连接，让浏览器自动重连
    };

    // 组件卸载时关闭连接
    return () => {
      console.log('SystemStatsProvider: Closing EventSource');
      eventSource.close();
    };
  }, []);

  return (
    <SystemStatsContext.Provider value={stats}>
      {children}
    </SystemStatsContext.Provider>
  );
}

// 创建一个自定义 Hook 以方便使用
export const useSystemStats = () => {
  const context = useContext(SystemStatsContext);
  if (context === undefined) {
    throw new Error('useSystemStats must be used within a SystemStatsProvider');
  }
  return context;
};