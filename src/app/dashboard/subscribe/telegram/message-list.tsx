"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IconRefresh, IconDownload, IconExternalLink, IconFolder, IconPhoto, IconVideo, IconFile, IconMusic } from '@tabler/icons-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface TelegramMessage {
  id: number;
  messageId: string;
  chatId?: string;
  chatTitle?: string;
  text?: string;
  tags: string[];
  forwardUrl?: string;
  mediaType?: string;
  fileName?: string;
  filePath: string[]; // 改为字符串数组
  mediaCount: number; // 添加媒体数量字段
  processed: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function TelegramMessageList() {
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // 获取文件类型
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

  // 获取文件图标
  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image': return <IconPhoto className="h-4 w-4" />;
      case 'video': return <IconVideo className="h-4 w-4" />;
      case 'audio': return <IconMusic className="h-4 w-4" />;
      default: return <IconFile className="h-4 w-4" />;
    }
  };

  // 生成媒体 URL
  const getMediaUrl = (filePath: string): string => {
    // 将文件路径转换为 API URL，确保路径分隔符统一
    const normalizedPath = filePath.replace(/\\/g, '/');
    return `/api/media/${normalizedPath}`;
  };

  // 从文件路径提取文件名
  const getFileNameFromPath = (filePath: string): string => {
    return filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown';
  };

  // 媒体预览组件
  const MediaPreview = ({ message }: { message: TelegramMessage }) => {
    if (!message.filePath || message.filePath.length === 0) return null;

    // 如果只有一个文件，显示单个预览
    if (message.filePath.length === 1) {
      const filePath = message.filePath[0];
      const fileName = getFileNameFromPath(filePath);
      const fileType = getFileType(fileName);
      const mediaUrl = getMediaUrl(filePath);

      return <SingleMediaPreview filePath={filePath} fileName={fileName} fileType={fileType} mediaUrl={mediaUrl} />;
    }

    // 多个文件，显示网格预览
    return (
      <div className="mt-3">
        <div className="text-sm font-medium mb-2">相册 ({message.filePath.length} 个文件)</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-w-2xl">
          {message.filePath.slice(0, 6).map((filePath, index) => {
            const fileName = getFileNameFromPath(filePath);
            const fileType = getFileType(fileName);
            const mediaUrl = getMediaUrl(filePath);
            
            return (
              <div key={index} className="relative">
                <SingleMediaPreview 
                  filePath={filePath} 
                  fileName={fileName} 
                  fileType={fileType} 
                  mediaUrl={mediaUrl}
                  isGridItem={true}
                />
                {index === 5 && message.filePath.length > 6 && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white text-sm font-medium rounded-lg">
                    +{message.filePath.length - 6}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 单个媒体预览组件
  const SingleMediaPreview = ({ 
    filePath, 
    fileName, 
    fileType, 
    mediaUrl, 
    isGridItem = false 
  }: { 
    filePath: string; 
    fileName: string; 
    fileType: string; 
    mediaUrl: string;
    isGridItem?: boolean;
  }) => {

    const containerClass = isGridItem 
      ? "relative aspect-square rounded-lg overflow-hidden bg-muted" 
      : "mt-3 relative w-full max-w-md";

    switch (fileType) {
      case 'image':
        return (
          <div className={containerClass}>
            <div className={isGridItem ? "relative w-full h-full" : "relative aspect-video rounded-lg overflow-hidden bg-muted"}>
              <Image
                src={mediaUrl}
                alt={fileName}
                fill
                className="object-cover hover:scale-105 transition-transform cursor-pointer"
                onClick={() => window.open(mediaUrl, '_blank')}
                onError={(e) => {
                  console.error('图片加载失败:', mediaUrl);
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            {!isGridItem && <p className="text-xs text-muted-foreground mt-1">{fileName}</p>}
          </div>
        );
      
      case 'video':
        if (isGridItem) {
          return (
            <div className={containerClass}>
              <div className="relative w-full h-full bg-black rounded-lg flex items-center justify-center cursor-pointer"
                   onClick={() => window.open(mediaUrl, '_blank')}>
                <IconVideo className="h-8 w-8 text-white" />
                <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                  视频
                </div>
              </div>
            </div>
          );
        }
        return (
          <div className={containerClass}>
            <video 
              controls 
              className="w-full rounded-lg bg-black"
              preload="metadata"
            >
              <source src={mediaUrl} />
              您的浏览器不支持视频播放
            </video>
            <p className="text-xs text-muted-foreground mt-1">{fileName}</p>
          </div>
        );
      
      case 'audio':
        if (isGridItem) {
          return (
            <div className={containerClass}>
              <div className="relative w-full h-full bg-gray-100 rounded-lg flex items-center justify-center cursor-pointer"
                   onClick={() => window.open(mediaUrl, '_blank')}>
                <IconMusic className="h-8 w-8 text-gray-600" />
                <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                  音频
                </div>
              </div>
            </div>
          );
        }
        return (
          <div className={containerClass}>
            <audio controls className="w-full max-w-md">
              <source src={mediaUrl} />
              您的浏览器不支持音频播放
            </audio>
            <p className="text-xs text-muted-foreground mt-1">{fileName}</p>
          </div>
        );
      
      default:
        if (isGridItem) {
          return (
            <div className={containerClass}>
              <div className="relative w-full h-full bg-gray-50 rounded-lg flex items-center justify-center cursor-pointer"
                   onClick={() => window.open(mediaUrl, '_blank')}>
                {getFileIcon(fileType)}
                <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                  文件
                </div>
              </div>
            </div>
          );
        }
        return (
          <div className={containerClass}>
            <div className="flex items-center space-x-2 p-3 border rounded-lg max-w-md">
              {getFileIcon(fileType)}
              <div className="flex-1">
                <p className="text-sm font-medium">{fileName}</p>
                <p className="text-xs text-muted-foreground">点击下载文件</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(mediaUrl, '_blank')}
              >
                <IconDownload className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
    }
  };

  // 获取消息列表
  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/telegram/messages');
      if (response.ok) {
        const data = await response.json();
        // 确保data是数组
        setMessages(Array.isArray(data) ? data : []);
      } else {
        toast.error('获取消息列表失败');
      }
    } catch (error) {
      console.error('获取消息列表失败:', error);
      toast.error('获取消息列表失败');
      setMessages([]); // 设置为空数组以避免错误
    } finally {
      setLoading(false);
    }
  };

  // 打开文件夹
  const openFolder = (filePath: string) => {
    if (filePath) {
      // 这里可以调用API来打开文件夹
      toast.info(`文件路径: ${filePath}`);
    }
  };

  useEffect(() => {
    fetchMessages();
    
    // 每30秒自动刷新
    const interval = setInterval(fetchMessages, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="text-center py-8">加载消息列表中...</div>;
  }

  if (messages.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="space-y-4">
            <div className="text-6xl">🤖</div>
            <div>
              <p className="text-lg font-medium">还没有收到任何转发消息</p>
              <p className="text-sm text-muted-foreground mt-2">
                请向Bot转发消息来开始使用
              </p>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>💡 使用方法：</p>
              <p>1. 在任何频道或群组中选择消息</p>
              <p>2. 点击"转发"并选择你的Bot</p>
              <p>3. 消息和媒体文件将自动下载到本地</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">收到的消息</h3>
        <Button variant="outline" size="sm" onClick={fetchMessages}>
          <IconRefresh className="mr-2 h-4 w-4" />
          刷新
        </Button>
      </div>
      
      <div className="grid gap-4">
        {messages.map((message) => (
          <Card key={message.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span>{message.chatTitle || '未知来源'}</span>
                    {message.mediaType && (
                      <Badge variant="secondary" className="text-xs">
                        {message.mediaType === 'album' ? '相册' : message.mediaType}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    消息ID: {message.messageId} • {new Date(message.createdAt).toLocaleString()}
                  </CardDescription>
                </div>
                
                <div className="flex items-center space-x-2">
                  {message.forwardUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(message.forwardUrl, '_blank')}
                    >
                      <IconExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  {message.filePath && message.filePath.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openFolder(message.filePath[0])}
                    >
                      <IconFolder className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            
            {(message.text || message.tags.length > 0 || message.fileName) && (
              <CardContent className="pt-0">
                {message.text && (
                  <p className="text-sm mb-3 line-clamp-3">{message.text}</p>
                )}
                
                {message.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {message.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* 媒体预览 */}
                <MediaPreview message={message} />
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}