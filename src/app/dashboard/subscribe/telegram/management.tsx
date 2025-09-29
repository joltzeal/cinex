"use client";

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { IconSettings, IconDownload, IconRobot, IconFile, IconPhoto, IconVideo, IconMusic, IconFileText, IconArchive, IconRefresh, IconSearch, IconTrash, IconEye, IconX } from '@tabler/icons-react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export interface TelegramSettings {
  enabled: boolean;
  apiId: string;
  apiHash: string;
  botToken: string; // Bot Token现在是必需的
  session?: string;
}

interface TelegramMessage {
  id: string;
  messageId: string;
  chatId: string | null;
  chatTitle: string;
  text: string | null;
  tags: string[];
  forwardUrl: string | null;
  mediaType: string | null;
  fileName: string | null;
  filePath: string[]; // 改为字符串数组
  mediaCount: number; // 添加媒体数量字段
  processed: boolean;
  createdAt: string;
  updatedAt: string;
  fileType: string | null;
  createdAtFormatted: string;
  textPreview: string | null;
  tagsArray: string[];
}

interface RealtimeMessage {
  type: 'new_message' | 'download_start' | 'download_progress' | 'download_complete' | 'download_error' | 'connection' | 'heartbeat' | 'bot_status' | 'bot_log';
  timestamp: string;
  messageId?: string;
  channelName?: string;
  text?: string;
  hasMedia?: boolean;
  mediaCount?: number;
  mediaType?: string;
  progress?: number;
  downloaded?: number;
  total?: number;
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  error?: string;
  message?: string;
  status?: 'started' | 'stopped' | 'restarted' | 'error';
  level?: 'info' | 'error' | 'warning';
}

interface TelegramManagementProps {
  initialSettings: TelegramSettings;
}

export function TelegramManagement({ initialSettings }: TelegramManagementProps) {
  const [settings, setSettings] = useState<TelegramSettings>(initialSettings);
  const [isLoading, setIsLoading] = useState(false);

  // 媒体预览相关辅助函数
  const getFileType = (fileName?: string): string => {
    if (!fileName) return 'unknown';
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (!extension) return 'unknown';
    
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    const videoTypes = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v'];
    const audioTypes = ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'wma'];
    
    if (imageTypes.includes(extension)) return 'image';
    if (videoTypes.includes(extension)) return 'video';
    if (audioTypes.includes(extension)) return 'audio';
    return 'file';
  };

  const getMediaUrl = (filePath: string): string => {
    const normalizedPath = filePath.replace(/\\/g, '/');
    return `/api/media/${normalizedPath}`;
  };

  const getFileNameFromPath = (filePath: string): string => {
    return filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown';
  };

  // 媒体预览组件
  const MediaPreview = ({ message }: { message: TelegramMessage }) => {
    if (!message.filePath || message.filePath.length === 0) return null;

    return (
      <div className="mt-3">
        {/* 横向滚动的媒体容器 */}
        <div className="w-full overflow-x-auto">
          <div className="flex space-x-2 pb-2 min-w-fit">
            {message.filePath.map((filePath, index) => {
              const fileName = getFileNameFromPath(filePath);
              const fileType = getFileType(fileName);
              const mediaUrl = getMediaUrl(filePath);
              
              return (
                <div key={index} className="flex-shrink-0">
                  <div className="w-25 h-25 relative rounded-lg overflow-hidden bg-muted cursor-pointer hover:scale-105 transition-transform"
                       onClick={() => window.open(mediaUrl, '_blank')}>
                    {fileType === 'image' ? (
                      <Image
                        src={mediaUrl}
                        alt={fileName}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          console.error('图片加载失败:', mediaUrl);
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : fileType === 'video' ? (
                      <div className="w-full h-full bg-black flex items-center justify-center">
                        <IconVideo className="h-6 w-6 text-white" />
                      </div>
                    ) : fileType === 'audio' ? (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <IconMusic className="h-6 w-6 text-gray-600" />
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                        <IconFile className="h-6 w-6 text-gray-600" />
                      </div>
                    )}
                    
                    {/* 文件类型标识 */}
                    <div className="absolute bottom-0 right-0 bg-black bg-opacity-75 text-white text-xs px-1 rounded-tl">
                      {fileType === 'image' ? '图' : fileType === 'video' ? '视' : fileType === 'audio' ? '音' : '文'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* 媒体数量和类型信息 */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {message.mediaCount > 0 ? `${message.mediaCount} 个媒体文件` : '无媒体'}
            {message.mediaType === 'album' && ' • 相册'}
          </span>
          {message.mediaCount > 4 && (
            <span className="text-xs text-muted-foreground">
              向右滑动查看更多
            </span>
          )}
        </div>
      </div>
    );
  };
  
  // 对话框状态
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  // 设置表单状态
  const [formSettings, setFormSettings] = useState(initialSettings);
  
  // Bot状态
  const [botStatus, setBotStatus] = useState({ running: false, configured: false });
  const [eagleStatus, setEagleStatus] = useState({ connected: false, checking: true });

  // 消息列表状态
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 实时消息状态
  const [realtimeMessages, setRealtimeMessages] = useState<RealtimeMessage[]>([]);
  const [sseConnected, setSseConnected] = useState(false);

  // 删除消息状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<TelegramMessage | null>(null);
  const [deleteLocalFiles, setDeleteLocalFiles] = useState(false);
  const [deletingMessage, setDeletingMessage] = useState(false);

  // Eagle相关状态
  const [addingToEagle, setAddingToEagle] = useState<string | null>(null);

  // 当initialSettings变化时更新formSettings
  useEffect(() => {
    setFormSettings(initialSettings);
    checkBotStatus();
    checkEagleStatus();
    fetchMessages();
  }, [initialSettings]);

  // 建立 SSE 连接
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      try {
        // 清理之前的连接
        if (eventSource) {
          eventSource.close();
        }

        console.log('正在建立 SSE 连接...');
        eventSource = new EventSource('/api/telegram');
        
        eventSource.onopen = () => {
          setSseConnected(true);
          console.log('✅ SSE 连接已建立');
          
          // 清除重连定时器
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
          }
        };

        eventSource.onmessage = (event) => {
          try {
            const message: RealtimeMessage = JSON.parse(event.data);
            console.log('收到 SSE 消息:', message);
            
            // 添加消息到列表，保留最新50条
            setRealtimeMessages(prev => [message, ...prev.slice(0, 49)]);
            
            // 如果收到新消息通知，刷新消息列表
            if (message.type === 'new_message' || message.type === 'download_complete') {
              // 延迟刷新，避免频繁更新
              setTimeout(() => {
                fetchMessages(currentPage, searchTerm);
              }, 1000);
            }
          } catch (error) {
            console.error('解析 SSE 消息失败:', error, event.data);
          }
        };

        eventSource.onerror = (error) => {
          console.error('SSE 连接错误:', error);
          setSseConnected(false);
          
          // 只有在连接状态为 CLOSED 时才重连
          if (eventSource?.readyState === EventSource.CLOSED) {
            console.log('SSE 连接已关闭，5秒后尝试重连...');
            reconnectTimer = setTimeout(() => {
              connectSSE();
            }, 5000);
          }
        };

      } catch (error) {
        console.error('建立 SSE 连接失败:', error);
        setSseConnected(false);
        
        // 发生异常时也尝试重连
        reconnectTimer = setTimeout(() => {
          connectSSE();
        }, 5000);
      }
    };

    connectSSE();

    return () => {
      console.log('清理 SSE 连接...');
      
      // 清理重连定时器
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      
      // 关闭连接
      if (eventSource) {
        eventSource.close();
        setSseConnected(false);
      }
    };
  }, []); // 移除 currentPage 和 searchTerm 依赖，避免不必要的重连

  // 移除自动刷新逻辑，避免页面闪烁

  // 检查Bot状态
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

  // 检查Eagle状态
  const checkEagleStatus = async () => {
    setEagleStatus({ connected: false, checking: true });
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时
      
      const response = await fetch('http://localhost:41595/api/application/info', {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const result = await response.json();
        setEagleStatus({ connected: true, checking: false });
        console.log('Eagle应用信息:', result);
      } else {
        setEagleStatus({ connected: false, checking: false });
      }
    } catch (error) {
      setEagleStatus({ connected: false, checking: false });
      console.log('Eagle未运行或连接失败:', error);
    }
  };

  // 获取消息列表
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
        }
      }
    } catch (error) {
      console.error('获取消息列表失败:', error);
      toast.error('获取消息列表失败');
    } finally {
      setMessagesLoading(false);
    }
  };

  // 搜索处理
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
    fetchMessages(1, term);
  };

  // 刷新消息列表
  const refreshMessages = () => {
    fetchMessages(currentPage, searchTerm);
  };

  // 获取文件类型图标
  const getFileIcon = (fileType: string | null) => {
    switch (fileType) {
      case 'image': return <IconPhoto className="h-4 w-4" />;
      case 'video': return <IconVideo className="h-4 w-4" />;
      case 'audio': return <IconMusic className="h-4 w-4" />;
      case 'document': return <IconFileText className="h-4 w-4" />;
      case 'archive': return <IconArchive className="h-4 w-4" />;
      default: return <IconFile className="h-4 w-4" />;
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 获取实时消息的显示内容（只显示重要消息）
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

  // 过滤显示的实时消息（排除心跳）
  const visibleRealtimeMessages = realtimeMessages.filter(msg => {
    const content = getRealtimeMessageContent(msg);
    return content.show;
  });

  // 通用保存设置函数
  const saveSettings = async (newSettings: TelegramSettings) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'telegramConfig',
          value: newSettings,
        }),
      });

      if (!response.ok) throw new Error('保存设置失败');

      const result = await response.json();
      if (result.success) {
        setSettings(result.data.value);
        
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
      toast.error('保存设置失败');
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

  // 处理设置保存
  const handleSaveSettings = async () => {
    const success = await saveSettings(formSettings);
    if (success) {
      setIsSettingsDialogOpen(false);
    }
  };

  // 处理Bot重启
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

  // 打开删除对话框
  const openDeleteDialog = (message: TelegramMessage) => {
    setMessageToDelete(message);
    setDeleteLocalFiles(false);
    setDeleteDialogOpen(true);
  };

  // 删除消息
  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;

    setDeletingMessage(true);
    try {
      const response = await fetch(`/api/telegram/messages/${messageToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteLocalFiles }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast.success(deleteLocalFiles ? '消息和本地文件已删除' : '消息已删除');
          // 刷新消息列表
          fetchMessages(currentPage, searchTerm);
        } else {
          toast.error(result.message || '删除失败');
        }
      } else {
        toast.error('删除请求失败');
      }
    } catch (error) {
      console.error('删除消息失败:', error);
      toast.error('删除消息失败');
    } finally {
      setDeletingMessage(false);
      setDeleteDialogOpen(false);
      setMessageToDelete(null);
    }
  };

  // 添加到Eagle
  const handleAddToEagle = async (message: TelegramMessage) => {
    if (!message.filePath || message.filePath.length === 0) {
      toast.error('该消息没有媒体文件');
      return;
    }

    setAddingToEagle(message.id);
    try {
      // 构建Eagle API请求数据
      const items = message.filePath.map((filePath) => {
        const mediaUrl = `${window.location.origin}/api/media/${filePath.replace(/\\/g, '/')}`;
        
        return {
          url: mediaUrl,
          name: message.text,
          website: message.forwardUrl || `telegram://${message.chatTitle}`,
          tags: [...message.tagsArray, message.chatTitle],
          modificationTime: new Date(message.createdAt).getTime(),
          
        };
      });

      const requestData = {
        items: items,
        folderId: "TELEGRAM_IMPORTS" // 可以根据需要修改文件夹ID
      };

      console.log('发送到Eagle的数据:', requestData);

      // 通过我们的API路由发送请求，避免跨域问题
      const response = await fetch('/api/eagle/add-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(result.message || `已成功添加 ${items.length} 个文件到Eagle`);
      } else {
        toast.error(result.message || '添加到Eagle失败');
      }
    } catch (error) {
      console.error('添加到Eagle失败:', error);
      toast.error('网络错误，请检查连接后重试');
    } finally {
      setAddingToEagle(null);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* 顶部控制栏 */}
      <div className='flex items-center justify-between flex-shrink-0'>
        <Heading
          title='Telegram Bot'
          description='监听转发消息并自动下载到本地'
        />
        
        <div className='flex items-center space-x-4'>
          {/* 启用/禁用开关 */}
          <div className='flex items-center space-x-2'>
            <Switch
              id="telegram-enabled"
              checked={settings.enabled}
              onCheckedChange={handleToggleEnabled}
              disabled={isLoading}
            />
            <Label htmlFor="telegram-enabled">启用 Telegram Bot</Label>
          </div>
          
          {/* 重启Bot按钮 */}
          <Button 
            variant="outline" 
            onClick={handleRestartBot}
            disabled={!settings.enabled || isLoading}
          >
            <IconDownload className='mr-2 h-4 w-4' />
            {isLoading ? '重启中...' : '重启Bot'}
          </Button>

          {/* 设置对话框 */}
          <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <IconSettings className='mr-2 h-4 w-4' /> 设置
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Telegram Bot 设置</DialogTitle>
                <DialogDescription>
                  配置Telegram Bot所需的凭据。所有字段都是必需的。
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="apiId">API_ID</Label>
                  <Input 
                    id="apiId" 
                    value={formSettings.apiId} 
                    onChange={(e) => setFormSettings({ ...formSettings, apiId: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiHash">API_HASH</Label>
                  <Input 
                    id="apiHash" 
                    value={formSettings.apiHash} 
                    onChange={(e) => setFormSettings({ ...formSettings, apiHash: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="botToken">BOT_TOKEN (必需)</Label>
                  <Input 
                    id="botToken" 
                    value={formSettings.botToken || ''} 
                    onChange={(e) => setFormSettings({ ...formSettings, botToken: e.target.value })} 
                    placeholder="请输入Bot Token"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    通过 @BotFather 创建Bot并获取Token
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSaveSettings} disabled={isLoading}>
                  {isLoading ? '保存中...' : '保存更改'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <Separator className="flex-shrink-0" />

      {/* 状态卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
        {/* Bot状态卡片 */}
        <Card className="h-20">
          <CardContent className="p-4 h-full">
            <div className="flex items-center justify-between h-full">
              <div className="flex items-center space-x-3">
                <IconRobot className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-sm font-medium">Bot状态</div>
                  <div className="text-xs text-muted-foreground">
                    {botStatus.configured ? '已配置' : '未配置'} • {settings.enabled ? '已启用' : '已禁用'}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <span className={botStatus.configured ? 'text-green-600' : 'text-red-600'}>
                  {botStatus.configured ? '✅' : '❌'}
                </span>
                <span className={settings.enabled ? 'text-green-600' : 'text-gray-400'}>
                  {settings.enabled ? '🟢' : '⚪'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 连接状态卡片 */}
        <Card className="h-20">
          <CardContent className="p-4 h-full">
            <div className="flex items-center justify-between h-full">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  {sseConnected ? (
                    <>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75"></div>
                    </>
                  ) : (
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium">连接状态</div>
                  <div className="text-xs text-muted-foreground">
                    {sseConnected ? '实时连接' : '连接断开'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">{messages.length}</div>
                <div className="text-xs text-muted-foreground">条消息</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Eagle状态卡片 */}
        <Card className="h-20">
          <CardContent className="p-4 h-full">
            <div className="flex items-center justify-between h-full">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  {eagleStatus.checking ? (
                    <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                  ) : eagleStatus.connected ? (
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  ) : (
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium">Eagle状态</div>
                  <div className="text-xs text-muted-foreground">
                    {eagleStatus.checking ? '检查中...' : eagleStatus.connected ? '已连接' : '未连接'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkEagleStatus}
                  disabled={eagleStatus.checking}
                >
                  <IconRefresh className={`h-3 w-3 ${eagleStatus.checking ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容区域：左右栏布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-hidden">
        {/* 左侧：消息列表 */}
        <div className="lg:col-span-2 min-h-0">
          <Card className="h-full flex flex-col min-h-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <IconFile className="h-4 w-4" />
                  <span className="font-medium">已下载消息</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshMessages}
                    disabled={messagesLoading}
                  >
                    <IconRefresh className="h-4 w-4" />
                  </Button>
                  <div className="relative">
                    <IconSearch className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索消息..."
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-8 w-48"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden min-h-0">
              <ScrollArea className="flex-1 min-h-0">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-muted-foreground">加载中...</div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-muted-foreground">暂无消息</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div key={message.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {message.chatTitle.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-sm">{message.chatTitle}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-muted-foreground">
                                  {message.createdAtFormatted}
                                </span>
                                {/* 操作按钮 */}
                                <div className="flex items-center space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAddToEagle(message)}
                                    disabled={addingToEagle === message.id || !message.filePath || message.filePath.length === 0}
                                    className="h-7 w-7 p-0"
                                    title="添加到Eagle"
                                  >
                                    {addingToEagle === message.id ? (
                                      <IconRefresh className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <IconEye className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDeleteDialog(message)}
                                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="删除消息"
                                  >
                                    <IconTrash className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                            
                            {/* 媒体预览 */}
                            <MediaPreview message={message} />
                            
                            {message.textPreview && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {message.textPreview}
                              </p>
                            )}
                            
                            {message.tagsArray.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {message.tagsArray.map((tag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    #{tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            
                            {message.forwardUrl && (
                              <a 
                                href={message.forwardUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                查看原消息
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              
              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t"> {/* 建议用 pt-4 和 border-t */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchMessages(currentPage - 1, searchTerm)}
                    disabled={currentPage <= 1 || messagesLoading}
                  >
                    上一页
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    第 {currentPage} 页，共 {totalPages} 页
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchMessages(currentPage + 1, searchTerm)}
                    disabled={currentPage >= totalPages || messagesLoading}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧：实时日志 */}
        <div className="min-h-0">
          <Card className="h-full flex flex-col min-h-0">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                {/* 连接状态动画指示器 */}
                <div className="relative">
                  {sseConnected ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75"></div>
                    </>
                  ) : (
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  )}
                </div>
                <span className="font-medium">实时日志</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden min-h-0">
              <ScrollArea className="h-full min-h-0">
                {visibleRealtimeMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 space-y-2">
                    {sseConnected ? (
                      <>
                        <div className="flex items-center space-x-2">
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                        <div className="text-muted-foreground text-sm">等待实时消息...</div>
                      </>
                    ) : (
                      <div className="text-muted-foreground text-sm">未连接到实时服务</div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleRealtimeMessages.map((msg, index) => {
                      const content = getRealtimeMessageContent(msg);
                      return (
                        <div key={index} className="border-l-2 border-muted pl-3 py-2 animate-in fade-in slide-in-from-top-1 duration-300">
                          <div className="flex items-start justify-between">
                            <p className={`text-sm ${content.color}`}>
                              {content.text}
                            </p>
                            <span className="text-xs text-muted-foreground ml-2 shrink-0">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除消息</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除来自 "{messageToDelete?.chatTitle}" 的这条消息吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="flex items-center space-x-2 py-4">
            <Checkbox
              id="deleteLocalFiles"
              checked={deleteLocalFiles}
              onCheckedChange={(checked) => setDeleteLocalFiles(checked as boolean)}
            />
            <Label 
              htmlFor="deleteLocalFiles" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              同时删除本地文件 ({messageToDelete?.filePath?.length || 0} 个文件)
            </Label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingMessage}>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteMessage}
              disabled={deletingMessage}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingMessage ? (
                <>
                  <IconRefresh className="mr-2 h-4 w-4 animate-spin" />
                  删除中...
                </>
              ) : (
                <>
                  <IconTrash className="mr-2 h-4 w-4" />
                  确认删除
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}