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

/**
 * useScrollSpy 自定义 Hook
 * @param ids - 需要监听的页面内板块的 ID 数组
 * @param rootRef - 指向滚动容器的 Ref 对象
 * @returns 当前在视口中处于激活状态的板块 ID
 */
function useScrollSpy(ids: string[], rootRef: React.RefObject<HTMLElement | null>) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const rootElement = rootRef.current;
    if (!rootElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        root: rootElement,
        // 【关键修改 #1】优化 rootMargin
        // 这个值的意思是：在滚动容器的顶部向下偏移 80px 的位置，创建一个高度占容器 40% 的“触发区域”。
        // 当任何板块的顶部进入这个区域时，它就会被标记为“激活”。
        // 这比之前的方法更可靠，避免了板块之间的“死区”。
        rootMargin: '-80px 0px -50% 0px',
      }
    );

    ids.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => {
      ids.forEach((id) => {
        const element = document.getElementById(id);
        if (element) observer.unobserve(element);
      });
    };
  }, [ids, rootRef]);

  return activeId;
}

/**
 * 纯展示用的导航栏组件
 */
const SettingsNavigation = ({ sections, activeId, onLinkClick }: { sections: { id: string, title: string }[], activeId: string | null, onLinkClick: (id: string) => void }) => (
  <div className="bg-background border-b flex-shrink-0">
    <div className="container mx-auto">
      <nav className="flex items-center space-x-2 p-3 sm:p-4 overflow-x-auto">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onLinkClick(section.id)}
            // 【关键修改 #2】使用主题颜色
            // 这里我们将硬编码的颜色替换为 shadcn/ui 的语义化颜色。
            // 这样按钮样式就会跟随你的全局主题（比如在 globals.css 中定义的变量）自动变化。
            className={`whitespace-nowrap px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${activeId === section.id
              ? 'bg-primary text-primary-foreground shadow-sm' // 激活状态：使用主色
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground' // 默认状态：使用柔和的前景色，鼠标悬浮时使用强调色
              }`}
          >
            {section.title}
          </button>
        ))}
      </nav>
    </div>
  </div>
);

/**
 * 定义主客户端组件的 Props 类型
 */
interface SettingsPageClientProps {
  settings?: Setting[];
}

/**
 * 主客户端组件，负责整个页面的布局和交互
 */
export default function SettingsPageClient(props: SettingsPageClientProps) {

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const settingsSections = [
    { id: 'media-server', title: '媒体服务器' },
    { id: 'downloader-settings', title: '下载器设置' },
    { id: 'download-rules', title: '下载规则' },
    { id: 'download-directory', title: '下载目录' },
    { id: 'ai-provider', title: 'AI 提供商' },
    { id: 'scraper-rule', title: '刮削规则' },
    { id: 'push-notification', title: '推送通知' },
    { id: 'advanced-settings', title: '高级设置' },
    { id: 'proxy-settings', title: '代理设置' },
  ];

  const [config, setConfig] = useState<Record<string, any> | undefined>(undefined);

  const sectionIds = settingsSections.map(s => s.id);
  const activeId = useScrollSpy(sectionIds, scrollContainerRef);

  const handleLinkClick = (id: string) => {
    const targetElement = document.getElementById(id);
    const containerElement = scrollContainerRef.current;

    if (targetElement && containerElement) {
      // 计算目标元素相对于滚动容器顶部的距离
      const topPosition = targetElement.offsetTop;

      // 使用滚动容器自身的 scrollTo 方法，而不是全局的 scrollIntoView
      containerElement.scrollTo({
        top: topPosition,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    const propsSettings = props.settings?.reduce((acc, item) => {
      acc[item.key] = item.value; // 假设你的表有 key 和 value 字段
      return acc;
    }, {} as Record<string, any>);
    if (propsSettings?.downloaderSettings) {
      const downloaderSettings = [];
      for (const key in propsSettings.downloaderSettings) {
        if (propsSettings.downloaderSettings.hasOwnProperty(key)) { // 推荐加上这个判断，避免遍历原型链上的属性
          console.log(key, propsSettings.downloaderSettings[key]);
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

    console.log(propsSettings);
    

    setConfig(propsSettings);
  }, [props.settings]);

  return (
    <div className="flex flex-col h-[calc(100dvh-62px)] w-full bg-secondary">
      <SettingsNavigation
        sections={settingsSections}
        activeId={activeId}
        onLinkClick={handleLinkClick}
      />

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="container mx-auto py-10">
          <h1 className="text-2xl font-bold mb-6 text-foreground">应用设置</h1>
          <div className="space-y-8">
            <div id="media-server">
              <MediaServerSettingsComponent initialData={config?.mediaServerConfig} />
            </div>
            <div id="downloader-settings">
              <DownloaderSettingsComponent initialData={config?.downloaderSettings ?? undefined} />
            </div>
            <div id="download-rules">
              <DownloadRuleSettings initialData={config?.downloadRuleConfig} />
            </div>
            <div id="download-directory">
              <DirectorySettingsComponent initialData={config?.downloadDirectoryConfig} />
            </div>
            <div id="ai-provider">
              <AiProviderSettingsComponent initialData={config?.aiProviderConfig} />
            </div>
            <div id="scraper-rule">
              <ScraperRuleSettings initialData={config?.scraperRuleConfig} />
            </div>
            <div id="push-notification">
              <PushNotificationSettingsComponent initialData={config?.pushNotificationConfig} />
            </div>
            <AdvancedSettings />
            <div id="proxy-settings">
              <ProxySettingsComponent initialData={config?.proxyUrl} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">


            </div>
          </div>
        </div>
      </div>
    </div>
  );
}