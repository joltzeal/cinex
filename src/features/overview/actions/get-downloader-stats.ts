'use server';

import { getActiveClient } from '@/features/download/downloader/manager';
import { DownloaderStats } from '@/types/download';

export async function getDownloaderStatsAction(): Promise<DownloaderStats> {
  try {
    const client = await getActiveClient();
    const stats = await client.getStats();
    return stats;
  } catch (error) {
    console.error('Failed to get downloader stats:', error);
    // 返回默认值
    return {
      downloadSpeed: 0,
      uploadSpeed: 0,
      totalDownloaded: 0,
      totalUploaded: 0,
    };
  }
}

