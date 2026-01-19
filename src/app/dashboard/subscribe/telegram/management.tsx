"use client";

import React, { useState } from "react";
import {
  Activity,
  Clock,
  Key,
  PauseCircle,
  RotateCcw,
  Search,
  Filter,
  ArrowUpDown,
  Play,
  FileText,
  Image as ImageIcon,
  Video,
  Copy,
  FolderOpen,
  AlertCircle,
  CheckCircle2,
  Terminal,
  X,
  BadgeCheck,
  ExternalLink,
  Folder,
  Share,
  Download,
  Trash2,
  Volume2,
  Maximize,
  Monitor,
  MoreHorizontal
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import PageContainer from "@/components/layout/page-container";
import { TelegramConfigSection } from "@/components/telegram/telegram-config";
import { TelegramMessage } from "@prisma/client";
import { toast } from "sonner";
import { RealtimeMessage } from "@/types/telegram";

// --- 类型定义 ---
interface MediaItem {
  id: string;
  source: string;
  sourceColor: string;
  type: "Video" | "Album" | "Document" | "Image";
  size: string;
  status: "downloading" | "completed" | "queued" | "failed";
  progress?: number;
  previewType: "video" | "album" | "doc" | "error";
  // 详情数据 (Mock)
  resolution?: string;
  format?: string;
  duration?: string;
  path?: string;
  messageText?: string;
}

// --- 模拟数据 ---

// 将数据库消息转换为MediaItem格式
const transformMessageToMediaItem = (msg: any): MediaItem => {
  const getMediaType = (mediaType: string | null, fileType: string | null): "Video" | "Album" | "Document" | "Image" => {
    if (mediaType === 'album') return 'Album';
    if (fileType === 'video') return 'Video';
    if (fileType === 'image') return 'Image';
    return 'Document';
  };

  const getPreviewType = (type: "Video" | "Album" | "Document" | "Image"): "video" | "album" | "doc" | "error" => {
    if (type === 'Video') return 'video';
    if (type === 'Album') return 'album';
    if (type === 'Document') return 'doc';
    return 'doc';
  };

  const getFileSize = (filePath: string[]): string => {
    return 'Unknown';
  };

  const type = getMediaType(msg.mediaType, msg.fileType);

  return {
    id: `#${msg.messageId}`,
    source: msg.chatTitle || '@unknown',
    sourceColor: 'bg-blue-400',
    type,
    size: getFileSize(msg.filePath),
    status: msg.processed ? 'completed' : 'queued',
    progress: msg.processed ? 100 : 0,
    previewType: getPreviewType(type),
    format: msg.fileName?.split('.').pop()?.toUpperCase() || 'Unknown',
    path: msg.filePath?.[0] || '/media/downloads/pending...',
    messageText: msg.text || msg.textPreview || 'No message content available.',
  };
};

// --- 子组件: 媒体预览 ---

const MediaPreview = ({ type }: { type: string }) => {
  if (type === "video") {
    return (
      <div className="relative w-24 h-16 rounded-md overflow-hidden bg-muted border border-border group cursor-pointer shadow-sm">
        <div className="absolute inset-0 bg-accent/50 group-hover:bg-accent/70 transition-colors" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-background/30 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-sm">
            <Play className="fill-foreground text-foreground ml-0.5" size={14} />
          </div>
        </div>
      </div>
    );
  }
  if (type === "album") {
    return (
      <div className="w-24 h-16 rounded-md overflow-hidden bg-muted border border-border grid grid-cols-2 grid-rows-2 gap-[1px]">
        <div className="bg-accent/40" />
        <div className="bg-accent/60" />
        <div className="bg-accent/50" />
        <div className="bg-card flex items-center justify-center text-xs font-mono font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
          +2
        </div>
      </div>
    );
  }
  if (type === "doc") {
    return (
      <div className="w-24 h-16 rounded-md border border-border bg-card flex items-center justify-center">
        <FileText className="text-muted-foreground" size={24} />
      </div>
    );
  }
  if (type === "error") {
    return (
      <div className="w-24 h-16 rounded-md overflow-hidden border border-border bg-muted relative flex items-center justify-center">
        <div className="absolute inset-0 bg-destructive/5" />
        <AlertCircle className="text-destructive drop-shadow-sm" size={20} />
      </div>
    );
  }
  return null;
};

const TypeBadge = ({ type }: { type: string }) => {
  const styles: Record<string, string> = {
    Video: "bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/20",
    Image: "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20",
    Album: "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20",
    Document: "bg-slate-500/10 text-slate-500 border-slate-500/20 hover:bg-slate-500/20",
  };
  const Icon = type === "Video" ? Video : type === "Document" ? FileText : ImageIcon;

  return (
    <Badge variant="outline" className={`${styles[type] || styles.Document} gap-1.5 font-normal`}>
      <Icon size={14} />
      {type}
    </Badge>
  );
};

// --- 子组件: 媒体详情弹窗 ---

const MediaDetailModal = ({
  open,
  onOpenChange,
  item
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MediaItem | null
}) => {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className=" min-w-[95vw] h-[85vh] p-0 gap-0 overflow-hidden flex flex-col lg:flex-row  border-border sm:rounded-xl ">
        {/* Visually hidden title for accessibility */}
        <DialogHeader className="sr-only">
          <DialogTitle>Media Details - {item.id}</DialogTitle>
        </DialogHeader>

        {/* Left: Media Player / Preview (Always Dark Theme style for Cinema feel) */}
        <div className="flex-1 bg-black relative flex items-center justify-center group overflow-hidden min-h-[300px]">
          {/* Backdrop Blur Effect */}
          <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-gray-800 to-black pointer-events-none" />

          {/* Top Metadata Overlay */}
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex gap-2">
              {item.resolution && <Badge variant="secondary" className="bg-black/50 text-white border-white/10 backdrop-blur-md">{item.resolution}</Badge>}
              <Badge variant="secondary" className="bg-black/50 text-white border-white/10 backdrop-blur-md">60fps</Badge>
            </div>
          </div>

          {/* Main Media Content Placeholder */}
          <div className="relative z-10 p-8 flex flex-col items-center justify-center w-full h-full">
            {item.type === "Video" ? (
              <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300 cursor-pointer">
                <Play className="fill-white text-white ml-1" size={36} />
              </div>
            ) : (
              <div className="text-white/20">
                {item.type === "Document" ? <FileText size={96} /> : <ImageIcon size={96} />}
              </div>
            )}
          </div>

          {/* Bottom Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-20 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
            {/* Timeline */}
            <div className="w-full h-1.5 bg-white/20 rounded-full mb-4 cursor-pointer relative group/timeline">
              <div className="absolute top-0 left-0 h-full w-[35%] bg-primary rounded-full">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow scale-0 group-hover/timeline:scale-100 transition-transform" />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                <button className="hover:text-primary transition-colors"><Play size={24} /></button>
                <button className="hover:text-primary transition-colors"><Volume2 size={24} /></button>
                <span className="text-xs font-mono text-white/80">04:12 / {item.duration || "12:45"}</span>
              </div>
              <div className="flex items-center gap-4">
                <button className="hover:text-primary transition-colors"><Monitor size={20} /></button>
                <button className="hover:text-primary transition-colors"><Maximize size={20} /></button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Sidebar Details */}
        <div className="w-full lg:w-[400px] flex flex-col bg-card border-l border-border h-full max-h-[50vh] lg:max-h-full">
          {/* Header */}
          <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
                {item.source.charAt(1).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-semibold text-sm">{item.source}</h4>
                  <BadgeCheck className="text-blue-500 w-4 h-4" />
                </div>
                <p className="text-muted-foreground text-xs">1.2M subscribers</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="lg:hidden">
              <X size={18} />
            </Button>
          </div>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              {/* Message Text */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wide">Message Text</label>
                <div className="text-sm leading-relaxed bg-muted/50 p-3 rounded-lg border border-border">
                  {item.messageText || "No message content available."}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Original Link</label>
                  <a href="#" className="text-sm text-primary hover:underline truncate flex items-center gap-1">
                    t.me/{item.source.slice(1)}/{item.id.slice(1)} <ExternalLink size={12} />
                  </a>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Resolution</label>
                    <p className="text-sm font-mono">{item.resolution || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Format</label>
                    <p className="text-sm font-mono">{item.format || "Unknown"}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Size</label>
                    <p className="text-sm font-mono">{item.size}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Duration</label>
                    <p className="text-sm font-mono">{item.duration || "N/A"}</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Local Path</label>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1.5 rounded border border-border break-all">
                    <Folder size={14} className="shrink-0" />
                    {item.path || "/media/downloads/pending..."}
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="p-6 border-t border-border bg-muted/30 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" className="w-full justify-start">
                <FolderOpen className="mr-2 h-4 w-4" /> Open Folder
              </Button>
              <Button variant="secondary" className="w-full justify-start">
                <Share className="mr-2 h-4 w-4" /> Forward
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="w-full justify-start text-primary border-primary/20 hover:bg-primary/10 hover:text-primary">
                <Download className="mr-2 h-4 w-4" /> Redownload
              </Button>
              <Button variant="outline" className="w-full justify-start text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
interface TelegramManagementProps {
  initialSettings: TelegramConfig;
}
// --- 主页面组件 ---

export default function TelegramManagement({ initialSettings }: TelegramManagementProps) {
  const [botStatus, setBotStatus] = useState({ running: false, configured: false });
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [realtimeMessages, setRealtimeMessages] = useState<RealtimeMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [settings, setSettings] = useState<TelegramConfig>(initialSettings);
  const [botUptime, setBotUptime] = useState<string>('0d 0h 0m');
  const [totalMessages, setTotalMessages] = useState(0);

  // 初始化：加载数据和建立SSE连接
  React.useEffect(() => {
    checkBotStatus();
    fetchMessages();

    // 建立SSE连接
    const eventSource = new EventSource('/api/telegram');

    eventSource.onmessage = (event) => {
      try {
        const data: RealtimeMessage = JSON.parse(event.data);
        setRealtimeMessages(prev => [...prev.slice(-49), data]);

        // 如果是新消息或下载完成，刷新消息列表
        if (data.type === 'new_message' || data.type === 'download_complete') {
          fetchMessages(currentPage, searchTerm);
        }

        // 如果是bot状态变化，更新状态
        if (data.type === 'bot_status') {
          checkBotStatus();
        }
      } catch (error) {
        console.error('解析SSE消息失败:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE连接错误:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);
  const handleRowClick = (item: MediaItem) => {
    setSelectedMedia(item);
    setIsModalOpen(true);
  };

  const checkBotStatus = async () => {
    try {
      const response = await fetch('/api/telegram/service');
      if (response.ok) {
        const status = await response.json();
        setBotStatus(status);
        console.log('Bot状态:', status);
      } else {
        console.error('获取Bot状态失败:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('获取Bot状态失败:', error);
      setBotStatus({ running: false, configured: false });
    }
  };

  const handleSettingsSave = async (newSettings: TelegramConfig) => {
    return await saveSettings(newSettings);
  };

  const fetchMessages = async (page = 1, search = '') => {
    setMessagesLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search })
      });

      const response = await fetch(`/api/telegram/messages?${params}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setMessages(result.data.messages);
          setTotalPages(result.data.pagination.totalPages);
          setCurrentPage(page);
          setTotalMessages(result.data.pagination.total);
        }
      }
    } catch (error) {
      console.error('获取消息列表失败:', error);
      toast.error('获取消息列表失败');
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
    fetchMessages(1, term);
  };
  const refreshMessages = () => {
    fetchMessages(currentPage, searchTerm);
  };

  const getRealtimeMessageContent = (msg: RealtimeMessage) => {
    switch (msg.type) {
      case 'connection':
        return { text: '🔗 SSE 连接已建立', color: 'text-green-600', show: true };
      case 'new_message':
        const mediaText = msg.hasMedia
          ? ` (包含 ${msg.mediaCount || 1} 个媒体${msg.mediaType === 'album' ? '，相册' : ''})`
          : '';
        return {
          text: `📨 新消息来自 ${msg.channelName || '未知频道'}${mediaText}`,
          color: 'text-blue-600',
          show: true
        };
      case 'download_complete':
        return { text: `✅ 下载完成: ${msg.fileName}`, color: 'text-green-600', show: true };
      case 'bot_status':
        const statusEmojis = {
          started: '🚀',
          stopped: '⏹️',
          restarted: '🔄',
          error: '❌'
        };
        const statusColors = {
          started: 'text-green-600',
          stopped: 'text-yellow-600',
          restarted: 'text-blue-600',
          error: 'text-red-600'
        };
        return {
          text: `${statusEmojis[msg.status || 'error']} ${msg.message}`,
          color: statusColors[msg.status || 'error'],
          show: true
        };
      case 'bot_log':
        const levelEmojis = {
          info: 'ℹ️',
          error: '❌',
          warning: '⚠️'
        };
        const levelColors = {
          info: 'text-blue-600',
          error: 'text-red-600',
          warning: 'text-yellow-600'
        };
        return {
          text: `${levelEmojis[msg.level || 'info']} ${msg.message}`,
          color: levelColors[msg.level || 'info'],
          show: true
        };
      case 'download_error':
        return { text: `❌ 下载失败: ${msg.error || msg.message}`, color: 'text-red-600', show: true };
      case 'heartbeat':
      case 'download_start':
      case 'download_progress':
      default:
        return { text: '', color: 'text-gray-400', show: false }; // 隐藏其他消息
    }
  };

  const visibleRealtimeMessages = realtimeMessages.filter(msg => {
    const content = getRealtimeMessageContent(msg);
    return content.show;
  });
const saveSettings = async (newSettings: TelegramConfig) => {
    setIsLoading(true);
    console.log(newSettings);
    
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'telegramConfig',
          value: newSettings,
        }),
      });
      console.log(response);

      if (!response.ok) throw new Error('保存设置失败1');

      const result = await response.json();
      if (result.success) {
        setSettings(result.data);

        // 如果是启用/禁用切换，需要控制Telegram服务
        if (settings.enabled !== newSettings.enabled) {
          await controlTelegramService(newSettings.enabled);
        }

        toast.success('设置已成功保存！');
        return true;
      }
      throw new Error('保存失败');
    } catch (error) {
      console.error(error);
      toast.error('保存设置失败2');
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  // 控制Telegram服务的启动/停止
  const controlTelegramService = async (enabled: boolean) => {
    try {
      const response = await fetch('/api/telegram/service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: enabled ? 'start' : 'stop' }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Telegram服务控制结果:', result.message);
      } else {
        console.error('控制Telegram服务失败');
      }
    } catch (error) {
      console.error('控制Telegram服务时出错:', error);
    }
  };

  // 处理启用/禁用切换
  const handleToggleEnabled = async (enabled: boolean) => {
    const newSettings = { ...settings, enabled };
    setSettings(newSettings); // 乐观更新
    await saveSettings(newSettings);
  };

  const handleRestartBot = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/telegram/service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart' }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(result.message || 'Bot已重启');
        // 延迟检查状态，给Bot时间启动
        setTimeout(() => {
          checkBotStatus();
        }, 2000);
      } else {
        toast.error(result.error || result.message || '重启Bot失败');
      }
    } catch (error) {
      console.error('重启Bot失败:', error);
      toast.error('重启Bot失败');
    } finally {
      setIsLoading(false);
    }
  };
  return (

    <PageContainer pageTitle="Mission Control" pageDescription="System status and active media queue monitoring" pageHeaderAction={
      <div className="flex items-center gap-3">
        <Button
          variant="destructive"
          className="bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 shadow-none"
          onClick={() => handleToggleEnabled(!settings.enabled)}
          disabled={isLoading}
        >
          <PauseCircle className="mr-2" size={18} />
          {settings.enabled ? '暂停' : '开启'}
        </Button>
        <Button onClick={handleRestartBot} disabled={isLoading}>
          <RotateCcw className="mr-2" size={18} />
          重启服务
        </Button>
        <HoverCard>
      <HoverCardTrigger asChild>
        <Button>
          <RotateCcw className="mr-2" size={18} />
          运行日志
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-[40vw] p-0 border-0 h-[70vh]">
        <div className="h-full  bg-card rounded-lg border border-border flex flex-col overflow-hidden shadow-sm shrink-0">
            <div className="px-4 py-2 bg-muted/50 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground font-mono">ACTIVITY_LOGS.log</span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/40" />
              </div>
            </div>
            <ScrollArea className="flex-1 p-4 bg-black/90 text-slate-300">
              <div className="font-mono text-xs leading-relaxed space-y-1">
                {visibleRealtimeMessages.map((msg, i) => {
                  const content = getRealtimeMessageContent(msg);
                  const timestamp = new Date(msg.timestamp).toLocaleTimeString('en-US', { hour12: false });
                  return (
                    <div key={i} className={`flex gap-3 ${i === visibleRealtimeMessages.length - 1 ? "animate-pulse" : ""}`}>
                      <span className="opacity-50 min-w-[60px]">{timestamp}</span>
                      <span className={`font-bold min-w-[60px] ${content.color}`}>[{msg.type.toUpperCase()}]</span>
                      <span className="opacity-80">{content.text}</span>
                    </div>
                  );
                })}
                {visibleRealtimeMessages.length === 0 && (
                  <div className="text-muted-foreground text-center py-4">等待实时消息...</div>
                )}
              </div>
            </ScrollArea>
          </div>
      </HoverCardContent>
    </HoverCard>
      </div>
    }>
      <div className="flex flex-col h-full bg-background text-foreground overflow-hidden gap-4">

        {/* 1. Header Section */}
        <header className="flex-shrink-0  z-10 border-b border-transparent">
          

          {/* Bento Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card border-border shadow-sm overflow-hidden relative py-2 gap-2">
              {botStatus.running && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
              )}
              <CardContent className="p-5 h-32 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground text-sm font-medium">Bot Status</span>
                  <Activity className="text-muted-foreground" size={18} />
                </div>
                <div className="flex items-center gap-3 mt-2">
                  {botStatus.running && (
                    <div className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </div>
                  )}
                  <span className="text-2xl font-bold tracking-tight">
                    {botStatus.running ? 'Online' : 'Offline'}
                  </span>
                </div>
                <p className={`text-xs mt-1 ${botStatus.running ? "text-green-500" : "text-muted-foreground"}`}>
                  {botStatus.running ? 'All systems operational' : 'Bot is not running'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-sm overflow-hidden relative py-2 gap-2">
              <CardContent className="p-5 h-32 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground text-sm font-medium">System Uptime</span>
                  <Clock className="text-muted-foreground" size={18} />
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-2xl font-bold tracking-tight">{botUptime}</span>
                </div>
                <p className="text-xs mt-1 text-muted-foreground">Since last restart</p>
              </CardContent>
            </Card>

            {/* Token Config Card */}
            <TelegramConfigSection 
            settings={settings} 
            onSave={handleSettingsSave} 
        />
            {/* <Card className="bg-card border-border shadow-sm md:col-span-2 py-2 gap-2">
              <CardContent className="px-5 py-3 h-32 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground text-sm font-medium">Bot Token Configuration</span>
                  <Key className="text-muted-foreground" size={18} />
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1 bg-muted border border-border rounded-md px-3 py-2 flex items-center justify-between group hover:border-primary/50 transition-colors">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-muted-foreground text-xs font-mono select-none">TOKEN:</span>
                      <code className="font-mono text-sm tracking-wider truncate">123456:ABC...XYZ</code>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                      <Copy size={14} />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Last rotated: 2 days ago</p>
              </CardContent>
            </Card> */}
          </div>
        </header>

        {/* 2. Main Content Split */}
        <div className="flex-1 flex flex-col min-h-0   gap-4 z-10">

          {/* Table Section */}
          <div className="flex-1 flex flex-col bg-card rounded-lg border border-border overflow-hidden shadow-sm">
            {/* Toolbar */}
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
                <Input
                  placeholder="Filter by Source, ID, or Media Type..."
                  className="pl-9 bg-background border-border placeholder:text-muted-foreground focus-visible:ring-1"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-9" onClick={refreshMessages}>
                  <RotateCcw size={16} className="mr-2" /> 刷新
                </Button>
                <Button variant="outline" size="sm" className="h-9">
                  <Filter size={16} className="mr-2" /> Filter
                </Button>
                <Button variant="outline" size="sm" className="h-9">
                  <ArrowUpDown size={16} className="mr-2" /> Sort
                </Button>
              </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead className="w-[100px] font-medium text-xs uppercase tracking-wider">ID</TableHead>
                    <TableHead className="w-[120px] font-medium text-xs uppercase tracking-wider">Preview</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Source</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Type</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Size</TableHead>
                    <TableHead className="w-1/4 font-medium text-xs uppercase tracking-wider">Download Status</TableHead>
                    <TableHead className="text-right font-medium text-xs uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messagesLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : messages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        暂无消息记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    messages.map((msg) => {
                      const item = transformMessageToMediaItem(msg);
                      return (
                    <TableRow
                      key={item.id}
                      className="border-border hover:bg-muted/50 group transition-colors cursor-pointer"
                      onClick={() => handleRowClick(item)}
                    >
                      <TableCell className="font-mono text-muted-foreground text-sm">{item.id}</TableCell>
                      <TableCell className="py-3">
                        <MediaPreview type={item.previewType} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${item.sourceColor}`} />
                          <span className="text-sm font-medium">{item.source}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <TypeBadge type={item.type} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.size}</TableCell>
                      <TableCell>
                        {item.status === "downloading" ? (
                          <div className="w-full max-w-[200px]">
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="text-primary font-medium">Downloading...</span>
                              <span className="text-muted-foreground">{item.progress}%</span>
                            </div>
                            <Progress value={item.progress} className="h-1.5" />
                          </div>
                        ) : item.status === "completed" ? (
                          <div className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-500 text-xs font-medium px-2 py-1 bg-green-500/10 rounded border border-green-500/20">
                            <CheckCircle2 size={14} /> Saved locally
                          </div>
                        ) : item.status === "queued" ? (
                          <div className="w-full max-w-[200px]">
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="text-muted-foreground font-medium">Queued</span>
                              <span className="text-muted-foreground">0%</span>
                            </div>
                            <Progress value={0} className="h-1.5" />
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 text-destructive text-xs font-medium px-2 py-1 bg-destructive/10 rounded border border-destructive/20">
                            <AlertCircle size={14} /> Failed (Timeout)
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            {item.status === "downloading" && <PauseCircle size={18} />}
                            {item.status === "completed" && <FolderOpen size={18} />}
                            {item.status === "queued" && <Play size={18} />}
                            {item.status === "failed" && <RotateCcw size={18} />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Footer */}
            <div className="px-6 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Showing <span className="font-medium text-foreground">{(currentPage - 1) * 10 + 1}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * 10, totalMessages)}</span> of <span className="font-medium text-foreground">{totalMessages}</span> entries
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs text-muted-foreground"
                  disabled={currentPage === 1}
                  onClick={() => fetchMessages(currentPage - 1, searchTerm)}
                >
                  Previous
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "ghost"}
                      size="sm"
                      className={`h-8 w-8 p-0 text-xs ${currentPage === pageNum ? '' : 'text-muted-foreground'}`}
                      onClick={() => fetchMessages(pageNum, searchTerm)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                {totalPages > 5 && <span className="text-muted-foreground px-1 text-xs">...</span>}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs text-muted-foreground"
                  disabled={currentPage === totalPages}
                  onClick={() => fetchMessages(currentPage + 1, searchTerm)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>

          {/* 3. Terminal / Logs */}
          
        </div>

        {/* Media Detail Modal Integration */}
        <MediaDetailModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          item={selectedMedia}
        />
      </div>
    </PageContainer>

  );
}