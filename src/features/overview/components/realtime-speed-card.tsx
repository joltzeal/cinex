'use client';

import { useEffect, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  UploadCloud,
  DownloadCloud,
  HardDrive,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DownloaderStats } from "@/types/download";
import { getDownloaderStatsAction } from "@/features/overview/actions/get-downloader-stats";
import { formatBytes, formatSpeed } from "@/lib/format";


export function RealtimeSpeedCard() {
  const [stats, setStats] = useState<DownloaderStats>({
    downloadSpeed: 0,
    uploadSpeed: 0,
    totalDownloaded: 0,
    totalUploaded: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 定时刷新数据，每3秒一次
    const interval = setInterval(async () => {
      try {
        setIsLoading(true);
        const newStats = await getDownloaderStatsAction();
        setStats(newStats);
      } catch (error) {
        console.error('Failed to refresh downloader stats:', error);
      } finally {
        setIsLoading(false);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>实时速率</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between">
        <div>
          <div className="flex items-center text-2xl font-bold">
            <ArrowUp className="text-green-500 mr-2" />
            <span className={isLoading ? 'opacity-50' : ''}>
              {formatSpeed(stats.uploadSpeed)}
            </span>
          </div>
          <div className="flex items-center text-2xl font-bold mt-2">
            <ArrowDown className="text-red-500 mr-2" />
            <span className={isLoading ? 'opacity-50' : ''}>
              {formatSpeed(stats.downloadSpeed)}
            </span>
          </div>
        </div>
        <div className="space-y-4 mt-6">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center text-muted-foreground">
              <UploadCloud className="mr-2 h-4 w-4" />
              <span>总上传量</span>
            </div>
            <span>{formatBytes(stats.totalUploaded)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center text-muted-foreground">
              <DownloadCloud className="mr-2 h-4 w-4" />
              <span>总下载量</span>
            </div>
            <span>{formatBytes(stats.totalDownloaded)}</span>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}