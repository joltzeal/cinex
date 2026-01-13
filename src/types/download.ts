// lib/downloaders/types.ts

import { PreviewResponse } from "@/lib/magnet/link-preview";
import { MovieDetail } from "./javbus";

// 统一的 Torrent 状态
export type TorrentStatus = 'downloading' | 'seeding' | 'paused' | 'checking' | 'error' | 'stalled' | 'completed';

// 下载器统计信息
export interface DownloaderStats {
  downloadSpeed: number; // 当前实时下载速度 (bytes/s)
  uploadSpeed: number; // 当前实时上传速度 (bytes/s)
  totalDownloaded: number; // 总下载量 (bytes)
  totalUploaded: number; // 总上传量 (bytes)
}

export interface TorrentAddOptions {
  savepath?: string; // 下载保存路径
  category?: string; // 以后还可以添加分类、标签等
  tags?: string[];
}
// 统一的 Torrent 数据结构
export interface Torrent {
  id: string; // 使用 torrent 的 hash 作为唯一 ID
  hash: string; // 磁力链接的哈希值
  name: string;
  size: number; // 总大小 (bytes)
  progress: number; // 进度 (0 to 1)
  status: TorrentStatus;
  downloadSpeed: number; // 下载速度 (bytes/s)
  uploadSpeed: number; // 上传速度 (bytes/s)
  eta: number; // 预计剩余时间 (seconds)
  addedOn: number; // 添加时间 (unix timestamp)
  contentPath: string; // 内容路径
  savePath: string; // 下载保存路径
  rootPath: string; // 根路径
}

// 下载器客户端必须实现的接口
export interface DownloaderClient {
  addTorrent(url: string, options?: TorrentAddOptions): Promise<{ success: boolean; message: string }>;
  getTorrents(): Promise<Torrent[]>;
  testConnection(): Promise<{ success: boolean; message: string }>;
  getStats(): Promise<DownloaderStats>; // 获取下载器实时统计信息
}

export interface DownloadUrlData {
  url: string;
  detail: PreviewResponse | null;
}
export interface DownloadMainProps {
  urls: string[];
  title?: string | null;
  description?: string | null;
  images?: File[];
  downloadImmediately?: boolean;
  movie?: MovieDetail | null; // 此处为movie detail json string
}