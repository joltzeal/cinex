"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, DownloadCloud } from "lucide-react";
import { DocumentWithURLs } from "@/lib/download/download-data";

// 声明迅雷SDK的全局类型
declare global {
  interface Window {
    thunderLink?: {
      newTask: (options: {
        downloadDir?: string;
        taskGroupName?: string;
        excludePath?: string;
        threadCount?: string;
        hideYunPan?: string;
        referer?: string;
        userAgent?: string;
        installFile?: string;
        taskGroupIcon?: string;
        createShortcut?: {
          name: string;
          targetFile: string;
          runParams?: string;
          startIn?: string;
        };
        tasks: Array<{
          url: string;
          name?: string;
          size?: number;
          dir?: string;
        }>;
      }) => Promise<any>;
    };
  }
}

interface ThunderDownloadProps {
  document?: DocumentWithURLs;
  documents?: DocumentWithURLs[];
  isBatch?: boolean;
  trigger?: React.ReactNode;
}

export function ThunderDownload({ document, documents, isBatch = false, trigger }: ThunderDownloadProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    if (typeof window === 'undefined' || !window.thunderLink) {
      toast.error("迅雷下载器未安装，请先安装迅雷客户端");
      return;
    }

    setIsLoading(true);

    try {
      let tasks: Array<{ url: string; name?: string; size?: number }> = [];

      if (isBatch && documents) {
        // 批量下载 - 将所有文档的URL合并到一个任务中
        documents.forEach(doc => {
          doc.downloadURLs.forEach(urlItem => {
            tasks.push({
              url: urlItem.url,
              name: doc.title || `下载_${Date.now()}`,
            });
          });
        });
      } else if (document) {
        // 单个文档下载
        document.downloadURLs.forEach(urlItem => {
          tasks.push({
            url: urlItem.url,
            name: document.title || `下载_${Date.now()}`,
          });
        });
      }

      if (tasks.length === 0) {
        toast.warning("没有可下载的链接");
        return;
      }

      console.log('合并后的任务列表:', tasks);
      console.log('任务总数:', tasks.length);

      // 调用迅雷SDK - 一次性添加所有任务
      console.log('调用迅雷SDK:', {
        downloadDir: 'cinex下载',
        taskGroupName: isBatch ? '批量下载' : document?.title || '下载任务',
        tasks: tasks,
      });

      await window.thunderLink!.newTask({
        downloadDir: 'cinex下载',
        taskGroupName: isBatch ? '批量下载' : document?.title || '下载任务',
        tasks: tasks,
      });

      toast.success(`成功添加 ${tasks.length} 个下载任务到迅雷`);
    } catch (error) {
      console.error('迅雷下载错误:', error);
      toast.error("下载任务添加失败，请检查迅雷客户端状态");
    } finally {
      setIsLoading(false);
    }
  };

  if (trigger) {
    return (
      <div onClick={handleDownload}>
        {trigger}
      </div>
    );
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleDownload}
      disabled={isLoading}
    >
      {isLoading ? (
        <DownloadCloud className="h-4 w-4 mr-2 animate-pulse" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      {isLoading ? "添加中..." : (isBatch ? "批量下载" : "迅雷下载")}
    </Button>
  );
}

// 批量下载按钮组件
export function BatchThunderDownload({ documents }: { documents: DocumentWithURLs[] }) {
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentWithURLs[]>([]);

  const handleBatchDownload = () => {
    if (selectedDocuments.length === 0) {
      toast.warning("请先选择要下载的文档");
      return;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">
        已选择 {selectedDocuments.length} 个文档
      </span>
      <ThunderDownload 
        documents={selectedDocuments} 
        isBatch={true} 
      />
    </div>
  );
}
