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