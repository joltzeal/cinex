import path from 'path';
import fs from 'fs/promises'; // Using promises for async operations
import type { MessageMetadata, AlbumMetadata } from '@/types/telegram';

export function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

export async function createFolderStructure(baseDir: string, channelName: string, identifier: string): Promise<string> {
  const sanitizedChannelName = sanitizeFileName(channelName);
  const targetDir = path.join(process.cwd(), 'media', baseDir, sanitizedChannelName, identifier);
  await fs.mkdir(targetDir, { recursive: true });
  return targetDir;
}

export async function saveMessageMetadata(messageDir: string, metadata: MessageMetadata): Promise<void> {
  const metadataPath = path.join(messageDir, 'metadata.txt');
  const content = [
    `消息ID: ${metadata.messageId}`,
    `频道: ${metadata.chatTitle}`,
    `时间: ${metadata.timestamp}`,
    `转发来源: ${metadata.forwardUrl || '无'}`,
    `标签: ${metadata.tags.join(', ') || '无'}`,
    ``,
    `原始文本:`,
    metadata.text || '无文本内容'
  ].join('\n');

  await fs.writeFile(metadataPath, content, 'utf8');
  console.log(`💾 Metadata saved: ${metadataPath}`);
}


export async function saveAlbumMetadata(albumDir: string, metadata: AlbumMetadata): Promise<void> {
    const metadataPath = path.join(albumDir, 'metadata.txt');
    const content = [
        `相册ID: ${metadata.albumId}`,
        `消息IDs: ${metadata.messageIds.join(', ')}`,
        `频道: ${metadata.chatTitle}`,
        `时间: ${metadata.timestamp}`,
        `转发来源: ${metadata.forwardUrl || '无'}`,
        `标签: ${metadata.tags.join(', ') || '无'}`,
        `媒体数量: ${metadata.mediaCount}`,
        ``,
        `原始文本:`,
        metadata.text || '无文本内容'
    ].join('\n');
    
    await fs.writeFile(metadataPath, content, 'utf8');
    console.log(`💾 Album metadata saved: ${metadataPath}`);
}

export async function saveFile(filePath: string, buffer: Buffer): Promise<void> {
  await fs.writeFile(filePath, buffer);
}

// 清理文件名
export function sanitizeFileNameForFile(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}