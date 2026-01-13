import { NextRequest } from 'next/server';
import os from 'os';
import { getDownloaderStatsAction } from '@/lib/download/downloader';

export const dynamic = 'force-dynamic';

// Store previous CPU measurements
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
    // First measurement - store and return 0
    previousCpuInfo = { idle, total };
    return 0;
  }

  // Calculate the difference between current and previous
  const idleDiff = idle - previousCpuInfo.idle;
  const totalDiff = total - previousCpuInfo.total;

  // Store current values for next calculation
  previousCpuInfo = { idle, total };

  // Calculate usage percentage
  const usage = 100 - (100 * idleDiff / totalDiff);

  return Math.max(0, Math.min(100, usage)); // Clamp between 0-100
}

async function getSystemMetrics() {
  const cpus = os.cpus();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;

  // Calculate CPU usage (comparing with previous measurement)
  const cpuUsage = getCpuUsage();

  // Get download stats
  const downloadStats = await getDownloaderStatsAction();

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
    network: {
      configured: downloadStats.configured,
      downloadSpeed: downloadStats.stats.downloadSpeed,
      uploadSpeed: downloadStats.stats.uploadSpeed,
      totalDownloaded: downloadStats.stats.totalDownloaded,
      totalUploaded: downloadStats.stats.totalUploaded,
    },
    timestamp: Date.now(),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isSSE = searchParams.get('stream') === 'true';

  if (!isSSE) {
    // Regular HTTP request
    const metrics = await getSystemMetrics();
    return Response.json(metrics);
  }

  // Server-Sent Events (SSE) stream
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendMetrics = async () => {
        try {
          const metrics = await getSystemMetrics();
          const data = `data: ${JSON.stringify(metrics)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch (error) {
          console.error('Error sending metrics:', error);
        }
      };

      // Send initial metrics
      await sendMetrics();

      // Send metrics every 2 seconds
      const interval = setInterval(sendMetrics, 2000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
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
