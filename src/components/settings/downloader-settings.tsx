'use client';

import { QbittorrentIcon } from "@/components/icons/QbittorrentIcon";
import { TransmissionIcon } from "@/components/icons/TransmissionIcon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DownloaderCard } from "@/features/download/downloader/downloader-card";
import { DownloaderConfig } from '@/lib/downloader';

interface DownloaderSettingsProps {
  initialData?: DownloaderConfig[] | null;
}

export function DownloaderSettingsComponent({ initialData }: DownloaderSettingsProps) {
  const data = initialData || [];

  const qbitSettings = data.find(s => s.name === 'qbittorrent');
  const transSettings = data.find(s => s.name === 'transmission');

  return (
    <Card>
      <CardHeader>
        <CardTitle>下载器</CardTitle>
        <CardDescription>
          管理您的下载器客户端。需要配置并启用后才能进行远程下载。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap justify-center gap-6 sm:justify-start">
          <DownloaderCard
            icon={<QbittorrentIcon className="h-10 w-10" />}
            title="qBittorrent"
            downloaderName="qbittorrent" 
            settings={qbitSettings}
          />
          <DownloaderCard
            icon={<TransmissionIcon className="h-10 w-10" />}
            title="Transmission"
            downloaderName="transmission"
            settings={transSettings} 
          />
        </div>
      </CardContent>
    </Card>
  );
}