"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DocumentDownloadURL, DocumentDownloadStatus, Prisma } from "@prisma/client";
import { CheckCircle, Copy, FileText, Loader, DownloadCloud, Info, XCircle, Pause, Download } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
// import Lightbox from "yet-another-react-lightbox";
// import Image from "next/image";
import { formatDate } from "@/lib/format";

interface DownloadProgressCellProps {
  urls: DocumentDownloadURL[];
}

// 1. 定义 detail 字段的 TypeScript 接口
interface Screenshot {
  time: number;
  screenshot: string;
}

interface DownloadDetail {
  name: string;
  size: number;
  type?: string;
  count?: number;
  error?: string;
  file_type?: string;
  screenshots?: Screenshot[];
}

// 2. 字节格式化辅助函数
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// 状态图标和颜色的映射
const statusConfig = {
  [DocumentDownloadStatus.downloaded]: { icon: CheckCircle, color: "text-green-500", label: "已完成", badgeVariant: "default" as const },
  [DocumentDownloadStatus.downloading]: { icon: Loader, color: "text-blue-500 animate-spin", label: "下载中", badgeVariant: "default" as const },
  [DocumentDownloadStatus.undownload]: { icon: DownloadCloud, color: "text-gray-400", label: "待下载", badgeVariant: "outline" as const },
  [DocumentDownloadStatus.error]: { icon: XCircle, color: "text-red-500", label: "失败", badgeVariant: "outline" as const },
  [DocumentDownloadStatus.checking]: { icon: Loader, color: "text-blue-500 animate-spin", label: "检查中", badgeVariant: "default" as const },
  [DocumentDownloadStatus.paused]: { icon: Pause, color: "text-yellow-500", label: "暂停", badgeVariant: "outline" as const },
};

export function DownloadProgressCell({ urls }: DownloadProgressCellProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSlides, setLightboxSlides] = useState<{ src: string }[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!urls || urls.length === 0) {
    return <span className="text-muted-foreground text-sm">无链接</span>;
  }

  const total = urls.length;
  const completed = urls.filter(url => url.status === 'downloaded').length;
  const progress = total > 0 ? (completed / total) * 100 : 0;
  
  // 检查是否有任意url正在下载
  const isDownloading = urls.some(url => url.status === 'downloading');

  // 按状态分组
  const groupedUrls = urls.reduce((acc, url) => {
    (acc[url.status] = acc[url.status] || []).push(url);
    return acc;
  }, {} as Record<DocumentDownloadStatus, DocumentDownloadURL[]>);

  const handleCopy = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast.success(message);
  };

  const copyAllLinks = () => {
    const allLinks = urls.map(u => u.url).join('\n');
    handleCopy(allLinks, "所有链接已复制到剪贴板");
  }

  const parseDetail = (detail: Prisma.JsonValue | null): DownloadDetail | null => {
    // 第一层检查：确保 detail 不是 null，且是一个对象（而不是字符串、数字等）
    if (!detail || typeof detail !== 'object' || Array.isArray(detail)) {
      return null;
    }

    try {
      return detail as unknown as DownloadDetail;
    } catch (error) {
      console.error("Failed to parse detail JSON:", error);
      return null;
    }
  };

  const handleScreenshotClick = (screenshots: Screenshot[], startIndex: number) => {
    const slides = screenshots.map(ss => ({ src: ss.screenshot }));
    setLightboxSlides(slides);
    setLightboxIndex(startIndex);
    setLightboxOpen(true);
  };

  const handleLightboxClose = () => {
    setLightboxOpen(false);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      // 如果 lightbox 是打开的，先关闭 lightbox
      if (lightboxOpen) {
        setLightboxOpen(false);
        return;
      }
      setDialogOpen(false);
    } else {
      setDialogOpen(true);
    }
  };


  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <div className="flex flex-col gap-2 cursor-pointer w-48">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">任务进度</span>
                    <span className="text-muted-foreground font-mono">{`${completed}/${total}`}</span>
                  </div>
                  <Progress value={progress} className={`h-2 ${isDownloading ? 'progress-downloading' : ''}`} />
                </div>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>已完成 {completed} 个，共 {total} 个任务。点击查看详情。</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DialogContent 
          className="sm:max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <span>下载任务详情</span>
            </DialogTitle>
            <DialogDescription>
              管理和查看所有下载链接的状态。
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto pr-4 my-4 space-y-4">
            {Object.entries(statusConfig).map(([status, config]) => {
              const currentUrls = groupedUrls[status as DocumentDownloadStatus] || [];
              if (currentUrls.length === 0) return null;

              return (
                <div key={status}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">{config.label} ({currentUrls.length})</h3>
                  <div className="space-y-2">
                    {currentUrls.map(url => {
                      const Icon = config.icon;
                      const detail = parseDetail(url.detail);
                      const formattedSize = detail?.size ? formatBytes(detail.size) : null;
                      const displayName = detail?.name || url.url;
                      // ✨ 新增逻辑：获取文件数量 ✨
                      const fileCount = detail?.count;
                      // 如果是 FOLDER 类型且有 count，就显示 count；否则认为是单个文件，显示 1。
                      // 如果 detail 不存在，则不显示。
                      const countDisplay = detail ? (detail.type === 'FOLDER' && fileCount ? fileCount : 1) : null;

                      

                      return (
                        <div key={url.id} className="flex items-center justify-between p-2 pl-3 border rounded-lg bg-muted/50 transition-colors hover:bg-muted/80">
                          {/* 主体内容区 */}
                          <div className="flex items-center gap-3 overflow-hidden">
                            <Icon className={`w-4 h-4 flex-shrink-0 ${config.color}`} />
                            <div className="flex flex-col overflow-hidden">
                              <p className="text-sm font-medium truncate" title={displayName}>{displayName}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant={config.badgeVariant} className="text-xs px-1.5 py-0">{config.label}</Badge>
                                {formattedSize && <Badge variant="outline" className="text-xs px-1.5 py-0">{formattedSize}</Badge>}
                                {
                                  url.createdAt && (
                                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                                      {formatDate(url.createdAt, )}
                                    </Badge>
                                  )
                                }
                                {countDisplay !== null && (
                                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                                    {countDisplay > 1 ? `${countDisplay} 个文件` : `1 个文件`}
                                  </Badge>
                                )}
                                
                              </div>
                            </div>
                          </div>

                          {/* 操作按钮区 */}
                          <div className="flex items-center flex-shrink-0 ml-2">
                            <Popover>
                              <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <PopoverTrigger asChild>
                                      <Button variant="ghost" size="icon" disabled={!detail}>
                                        <Info className="w-4 h-4" />
                                      </Button>
                                    </PopoverTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>查看详情</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <PopoverContent className="w-80" side="left" align="center">
                                <div className="grid gap-4">
                                  <div className="space-y-2">
                                    <h4 className="font-medium leading-none">详细信息</h4>
                                    <p className="text-sm text-muted-foreground break-all">
                                      <Link href={url.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{url.url}</Link>
                                    </p>
                                  </div>
                                  
                                  {detail?.screenshots && detail.screenshots.length > 0 && (
                                    <div className="space-y-2">
                                      <h4 className="font-medium leading-none">截图预览</h4>
                                      <div className="grid grid-cols-2 gap-2">
                                        {detail.screenshots.slice(0, 4).map((ss, index) => (
                                          <div
                                            key={index}
                                            className="relative aspect-video overflow-hidden rounded-md cursor-pointer group"
                                            onClick={() => handleScreenshotClick(detail.screenshots!, index)}
                                          >
                                            <img
                                              src={ss.screenshot}
                                              alt={`Screenshot ${index + 1}`}
                                              
                                              className="object-cover transition-transform duration-300 group-hover:scale-110 "
                                              sizes="(max-width: 768px) 50vw, 33vw"
                                            />
                                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                            
                            <Button variant="ghost" size="icon" onClick={() => handleCopy(url.url, "链接已复制!")}>
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={copyAllLinks}>
              <Copy className="w-4 h-4 mr-2" />
              复制所有链接
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* <Lightbox
        open={lightboxOpen}
        close={handleLightboxClose}
        slides={lightboxSlides}
        index={lightboxIndex}
        carousel={{
          finite: true,
        }}
        controller={{
          closeOnBackdropClick: true,
          closeOnPullDown: true,
        }}
        render={{
          buttonPrev: lightboxSlides.length <= 1 ? () => null : undefined,
          buttonNext: lightboxSlides.length <= 1 ? () => null : undefined,
        }}
      /> */}
    </>
  );
}