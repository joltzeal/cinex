import { useEffect, useState, useRef } from 'react';

export interface SystemMetrics {
  cpu: {
    usage: number;
    model: string;
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  network: {
    configured: boolean;
    downloadSpeed: number;
    uploadSpeed: number;
    totalDownloaded: number;
    totalUploaded: number;
  };
  timestamp: number;
}

export function useSystemMetrics() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Create EventSource connection for SSE
    const eventSource = new EventSource('/api/system/metrics?stream=true');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMetrics(data);
      } catch (error) {
        console.error('Failed to parse metrics:', error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, []);

  return { metrics, isConnected };
}
