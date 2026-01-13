import { getActiveClient } from '@/features/download/downloader/manager';
import { DownloaderStats } from '@/types/download';

export interface DownloaderStatsResult {
  configured: boolean;
  stats: DownloaderStats;
}

export async function getDownloaderStatsAction(): Promise<DownloaderStatsResult> {
  try {

    const client = await getActiveClient();

    const stats = await client.getStats();
    return {
      configured: true,
      stats
    };
  } catch (error) {
    // console.error('Failed to get downloader stats:', error);
    // 返回默认值，标记为未配置
    return {
      configured: false,
      stats: {
        downloadSpeed: 0,
        uploadSpeed: 0,
        totalDownloaded: 0,
        totalUploaded: 0,
      }
    };
  }
}

