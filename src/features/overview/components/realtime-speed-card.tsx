'use client';

import { useEffect, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  UploadCloud,
  DownloadCloud,
  Settings,
} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
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
  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
    // 初始加载
    const loadStats = async () => {
      try {
        setIsLoading(true);
        const result = await getDownloaderStatsAction();
        setIsConfigured(result.configured);
        setStats(result.stats);
      } catch (error) {
        console.error('Failed to load downloader stats:', error);
        setIsConfigured(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();

    // 定时刷新数据，每3秒一次
    const interval = setInterval(async () => {
      try {
        const result = await getDownloaderStatsAction();
        setIsConfigured(result.configured);
        setStats(result.stats);
      } catch (error) {
        console.error('Failed to refresh downloader stats:', error);
        setIsConfigured(false);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // 如果没有配置下载器，显示空状态
  if (!isConfigured) {
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>实时速率</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
          <Empty className="md:p-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Settings className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>未配置下载器</EmptyTitle>
              <EmptyDescription>
                请先配置并启用一个下载器以查看实时速率统计
              </EmptyDescription>
            </EmptyHeader>
            <Button asChild>
              <Link href="/dashboard/settings">
                前往设置
              </Link>
            </Button>
          </Empty>
        </CardContent>
      </Card>
    );
  }

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
        <div className="space-y-4 ">
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