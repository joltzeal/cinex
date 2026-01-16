'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AiProviderSettingsComponent } from '@/components/settings/ai-provider-settings';
import { MediaServerSettingsComponent } from '@/components/settings/media-server-settings';
import { PushNotificationSettingsComponent } from '@/components/settings/push-notification-settings';
import { DirectorySettingsComponent } from '@/components/settings/download-directory-settings';
import { AdvancedSettings } from '@/components/settings/advanced-settings';
import { DownloaderSettingsComponent } from '@/components/settings/downloader-settings';
import { DownloadRuleSettings } from '@/components/settings/download-rule-settings';
import { ProxySettingsComponent } from '@/components/settings/proxy-settings';
import { Setting } from '@prisma/client';
import { ScraperRuleSettings } from '@/components/settings/scraper-rule-settings';
import { Button } from '@/components/ui/button';
import { Scrollspy } from '@/components/ui/scrollspy';
import { Card } from '@/components/ui/card';
import {
  Server,
  Download,
  FileCheck,
  FolderOpen,
  Sparkles,
  FileSearch,
  Bell,
  Settings,
  Network,
} from 'lucide-react';

interface SettingsPageClientProps {
  settings?: Setting[];
}

/**
 * 主客户端组件，负责整个页面的布局和交互
 */
export default function SettingsPageClient(props: SettingsPageClientProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const settingsSections = [
    { id: 'media-server', title: '媒体服务器', icon: Server },
    { id: 'downloader-settings', title: '下载器设置', icon: Download },
    { id: 'download-rules', title: '下载规则', icon: FileCheck },
    { id: 'download-directory', title: '下载目录', icon: FolderOpen },
    { id: 'ai-provider', title: 'AI 提供商', icon: Sparkles },
    { id: 'scraper-rule', title: '刮削规则', icon: FileSearch },
    { id: 'push-notification', title: '推送通知', icon: Bell },
    { id: 'advanced-settings', title: '高级设置', icon: Settings },
    { id: 'proxy-settings', title: '代理设置', icon: Network },
  ];

  const [config, setConfig] = useState<Record<string, any> | undefined>(undefined);

  console.log(config);
  

  useEffect(() => {
    const propsSettings = props.settings?.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {} as Record<string, any>);

    if (propsSettings?.downloaderSettings) {
      const downloaderSettings = [];
      for (const key in propsSettings.downloaderSettings) {
        if (propsSettings.downloaderSettings.hasOwnProperty(key)) {
          downloaderSettings.push({
            name: key,
            enabled: propsSettings.downloaderSettings[key]?.enabled ?? false,
            host: propsSettings.downloaderSettings[key]?.host ?? null,
            port: propsSettings.downloaderSettings[key]?.port ?? null,
            username: propsSettings.downloaderSettings[key]?.username ?? null,
            password: propsSettings.downloaderSettings[key]?.password ?? null,
            isDefault: propsSettings.downloaderSettings[key]?.isDefault ?? false,
          });
        }
      }
      propsSettings.downloaderSettings = downloaderSettings;
    }

    setConfig(propsSettings);
  }, [props.settings]);

  return (
    <div className="flex gap-6 h-[calc(100vh-64px)] px-6 ">
        {/* 左侧导航菜单 */}
        <aside className="w-64 shrink-0">
          <Card className="p-2 shadow-sm border-muted/50">
            <nav className="sticky top-0">
              <Scrollspy offset={100} targetRef={parentRef} className="flex flex-col gap-1">
                {settingsSections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <Button
                      key={section.id}
                      variant="ghost"
                      data-scrollspy-anchor={section.id}
                      className="justify-start gap-3 font-normal h-11 px-3 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-sm hover:bg-accent/50 transition-all"
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{section.title}</span>
                    </Button>
                  );
                })}
              </Scrollspy>
            </nav>
          </Card>
        </aside>

        {/* 右侧内容区域 */}
        <div className="flex-1 min-w-0">
          <div
            ref={parentRef}
            className="h-full overflow-y-auto pr-2 scrollbar-hide"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            <div className="space-y-6 pb-8">
              <section id="media-server">
                <MediaServerSettingsComponent initialData={config?.mediaServerConfig} />
              </section>

              <section id="downloader-settings">
                <DownloaderSettingsComponent initialData={config?.downloaderSettings ?? undefined} />
              </section>

              <section id="download-rules">
                <DownloadRuleSettings initialData={config?.downloadRuleConfig} />
              </section>

              <section id="download-directory">
                <DirectorySettingsComponent initialData={config?.downloadDirectoryConfig} />
              </section>

              <section id="ai-provider">
                <AiProviderSettingsComponent initialData={config?.aiProviderConfig} />
              </section>

              <section id="scraper-rule">
                <ScraperRuleSettings initialData={config?.scraperRuleConfig} />
              </section>

              <section id="push-notification">
                <PushNotificationSettingsComponent initialData={config?.pushNotificationConfig} />
              </section>

              <section id="advanced-settings">
                <AdvancedSettings />
              </section>

              <section id="proxy-settings">
                <ProxySettingsComponent initialData={config?.proxyConfig} />
              </section>
            </div>
          </div>
        </div>
      </div>
  );
}