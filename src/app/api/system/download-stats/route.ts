import { NextRequest } from 'next/server';
import { getDownloaderStatsAction } from '@/lib/download/downloader';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const result = await getDownloaderStatsAction();
    return Response.json(result);
  } catch (error) {
    console.error('Failed to get download stats:', error);
    return Response.json(
      {
        configured: false,
        stats: {
          downloadSpeed: 0,
          uploadSpeed: 0,
          totalDownloaded: 0,
          totalUploaded: 0,
        },
      },
      { status: 500 }
    );
  }
}
