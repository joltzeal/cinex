export interface TelegramConfig {
  enabled: boolean;
  apiId: string;
  apiHash: string;
  botToken: string;
  session?: string;
}

export interface ProxyConfig {
  ip: string;
  port: number;
  socksType: 5;
  timeout: number;
}

export interface MessageMetadata {
  messageId: string;
  chatTitle: string;
  timestamp: string;
  forwardUrl: string | null;
  tags: string[];
  text: string;
}

export interface AlbumMetadata extends MessageMetadata {
  albumId: string;
  messageIds: string[];
  mediaCount: number;
}

// This interface can be expanded based on what you need to save
export interface TelegramMessageData {
  messageId: string;
  chatId: string | null;
  chatTitle: string;
  text: string | null;
  tags: string[];
  forwardUrl: string | null;
  mediaType: string | null;
  fileName: string | null;
  filePath: string[];
  mediaCount: number;
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

export interface RealtimeMessage {
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
