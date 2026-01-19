import { NextRequest } from 'next/server';
import os from 'os';
import { getDownloaderStatsAction } from '@/lib/download/downloader';

export const dynamic = 'force-dynamic';

let previousCpuInfo: { idle: number; total: number } | null = null;

function getCpuUsage(): number {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;

  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      total += cpu.times[type as keyof typeof cpu.times];
    }
    idle += cpu.times.idle;
  });

  if (!previousCpuInfo) {
    previousCpuInfo = { idle, total };
    return 0;
  }

  const idleDiff = idle - previousCpuInfo.idle;
  const totalDiff = total - previousCpuInfo.total;
  previousCpuInfo = { idle, total };

  const usage = 100 - (100 * idleDiff / totalDiff);
  return Math.max(0, Math.min(100, usage));
}

async function getSystemMetrics() {
  const cpus = os.cpus();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const cpuUsage = getCpuUsage();

  let network;
  try {
    const downloadStats = await getDownloaderStatsAction();
    network = {
      configured: downloadStats.configured,
      downloadSpeed: downloadStats.stats.downloadSpeed,
      uploadSpeed: downloadStats.stats.uploadSpeed,
      totalDownloaded: downloadStats.stats.totalDownloaded,
      totalUploaded: downloadStats.stats.totalUploaded,
    };
  } catch {
    network = { error: true };
  }

  return {
    cpu: {
      usage: cpuUsage,
      model: cpus[0]?.model || 'Unknown',
      cores: cpus.length,
    },
    memory: {
      total: totalMemory,
      used: usedMemory,
      free: freeMemory,
      usagePercent: (usedMemory / totalMemory) * 100,
    },
    network,
    timestamp: Date.now(),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isSSE = searchParams.get('stream') === 'true';

  if (!isSSE) {
    const metrics = await getSystemMetrics();
    return Response.json(metrics);
  }

  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const sendMetrics = async () => {
        try {
          const metrics = await getSystemMetrics();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(metrics)}\n\n`));
        } catch {}
      };

      await sendMetrics();
      intervalId = setInterval(sendMetrics, 2000);

      request.signal.addEventListener('abort', () => {
        if (intervalId) clearInterval(intervalId);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
