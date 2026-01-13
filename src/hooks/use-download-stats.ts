import { useEffect, useState } from 'react';
import { DownloaderStats } from '@/types/download';

export interface DownloadStatsResult {
  configured: boolean;
  stats: DownloaderStats;
}

export function useDownloadStats(intervalMs: number = 2000) {
  const [stats, setStats] = useState<DownloadStatsResult>({
    configured: false,
    stats: {
      downloadSpeed: 0,
      uploadSpeed: 0,
      totalDownloaded: 0,
      totalUploaded: 0,
    },
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/system/download-stats');
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch download stats:', error);
      }
    };

    // Fetch immediately
    fetchStats();

    // Then fetch at interval
    const interval = setInterval(fetchStats, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return stats;
}
