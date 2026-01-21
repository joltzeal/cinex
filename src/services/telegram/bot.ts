import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage, NewMessageEvent } from 'telegram/events';

import path from 'path';

// Services
import * as db from './tgdb';
import * as fs from './file';
// Utils
import {
  getProxyConfigFromEnv,
  extractTagsAndTitle,
  generateForwardUrl,
  cleanTextForDb,
  broadcastToSSE
} from './utils';
import { logger } from '@/lib/logger';

export class TelegramBot {
  private client: TelegramClient | null = null;
  private isRunning: boolean = false;
  private isShuttingDown: boolean = false;
  private downloadBaseDir: string | null = null;
  private messageHandler: any = null;
  private startTime: number | null = null;

  private albumMessages: Record<string, Api.Message[]> = {};
  private processedMessages: Set<string> = new Set();

  public getStatus() {
    return {
      running: this.isRunning,
      configured: true,
      uptime: this.getUptime()
    };
  }

  private getUptime(): string {
    if (!this.startTime) return '0d 0h 0m';
    const diff = Date.now() - this.startTime;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${days}d ${hours}h ${minutes}m`;
  }

  public async start(): Promise<boolean> {
    if (this.isRunning) {
      logger.info('✅ Telegram Bot 正在运行');
      return true;
    }

    logger.info('🚀 正在启动 Telegram Bot...');
    this.isShuttingDown = false;

    try {
      // 获取下载目录
      this.downloadBaseDir = await db.getDownloadDirectory();
      if (!this.downloadBaseDir) {
        logger.error('❌ 无法启动 Bot: 下载目录未配置.');
        return false;
      }

      const config = await db.getTelegramConfig();
      if (!config || !config.enabled) {
        logger.error('ℹ️ 无法启动 Bot: Telegram 功能未启用或未配置.');
        return false;
      }
      const { apiId, apiHash, botToken, session } = config;
      if (!apiId || !apiHash || !botToken) {
        logger.error(
          '❌ 无法启动 Bot: 配置不完整: API_ID、API_HASH 和 BOT_TOKEN 未配置.'
        );
        return false;
      }

      
      
      const stringSession = new StringSession(session || '');
      this.client = new TelegramClient(
        stringSession,
        parseInt(apiId, 10),
        apiHash,
        {
          connectionRetries: 5,
          proxy: await db.getPorxy()
        }
      );

      await this.client.start({
        botAuthToken: botToken,
        onError: (err) => logger.error(`🔴 Connection error:${err}`)
      });

      const me = await this.client.getMe();
      if (typeof me === 'boolean') {
        throw new Error('Failed to get bot info.');
      }
      logger.info(
        `✅ Telegram Bot 连接成功: ${me.firstName} (@${me.username})`
      );

      const newSession = this.client.session.save();

      // if (newSession !== session) {
      //   await db.saveTelegramSession(newSession);
      // }

      this.messageHandler = this.handleForwardedMessage.bind(this);
      this.client.addEventHandler(
        this.messageHandler,
        new NewMessage({
          incoming: true,
          func: (event) => !!event.message.fwdFrom
        })
      );

      this.isRunning = true;
      this.startTime = Date.now();
      logger.info('✅ Telegram Bot 启动成功并开始监听消息.');
      return true;
    } catch (error) {
      logger.error(`❌ 无法启动 Bot:${(error as Error).message}`);
      this.isRunning = false;
      return false;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning || !this.client) {
      logger.info('ℹ️ Bot is not running.');
      return;
    }
    logger.info('🛑 Stopping Telegram Bot...');
    this.isShuttingDown = true;

    try {
      // Remove event handler if it exists
      if (this.messageHandler) {
        this.client.removeEventHandler(
          this.messageHandler,
          new NewMessage({
            incoming: true,
            func: (event) => !!event.message.fwdFrom
          })
        );
        this.messageHandler = null;
      }

      // Disconnect with timeout
      await Promise.race([
        this.client.disconnect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Disconnect timeout')), 5000)
        )
      ]).catch((error) => {
        logger.warn(`Disconnect warning: ${error.message}`);
      });
    } catch (error) {
      logger.error(`Error during disconnect: ${error}`);
    } finally {
      this.client = null;
      this.isRunning = false;
      this.isShuttingDown = false;
      this.startTime = null;
      logger.info('✅ Bot has been stopped.');
    }
  }

  public async restart(): Promise<boolean> {
    logger.info('🔄 Restarting bot...');
    await this.stop();
    // A small delay to ensure resources are released
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return this.start();
  }

  private async handleForwardedMessage(event: NewMessageEvent) {
    if (this.isShuttingDown) return;

    const { message } = event;
    const { groupedId, forward } = message as Api.Message;

    if (!forward) return; // Should not happen due to event filter, but as a safeguard
    try {
      // 获取频道名称
      const channelName = (forward.chat as Api.Chat).title || 'Unknown Channel';
      // 如果是相册消息，则处理相册
      if (groupedId) {
        const groupKey = groupedId.toString();
        if (!this.albumMessages[groupKey]) {
          this.albumMessages[groupKey] = [];
          setTimeout(
            () => this.processAlbum(groupKey, channelName, forward as any),
            1500
          ); // Wait 1.5s
        }
        this.albumMessages[groupKey].push(message);
      }
      // 如果是单个消息，则处理单个消息
      else {
        logger.info('--------------------------------');
        logger.info('🔗 处理单条消息');
        logger.info(`频道名称: ${channelName}`);
        logger.info('--------------------------------');
        const messageKey = `${message.id}_${message.chatId}`;
        if (this.processedMessages.has(messageKey)) return;
        this.processedMessages.add(messageKey);

        await broadcastToSSE({
          type: 'new_message',
          messageId: message.id.toString(),
          channelName: channelName,
          text: message.text || '',
          hasMedia: !!message.media,
          mediaCount: message.media ? 1 : 0
        });

        await this.processSingleMessage(message, forward as any);

        setTimeout(() => this.processedMessages.delete(messageKey), 60000); // Clean up after 1 min
      }
    } catch (error) {
      logger.error(`❌ 无法处理转发消息: ${error}`);
    }
  }

  private async processAlbum(
    groupKey: string,
    channelName: string,
    forward: any
  ) {
    const messages = this.albumMessages[groupKey];
    if (!messages || messages.length === 0) return;

    logger.info(
      `--------------------------------\n🖼️ Processing album ${groupKey} with ${messages.length} items from "${channelName}".`
    );

    const mediaCount = messages.filter((msg) => msg.media).length;
    await broadcastToSSE({
      type: 'new_message',
      messageId: messages[0].id.toString(), // Use first message ID for reference
      channelName: channelName,
      text: messages[0].text || '',
      mediaType: 'album',
      mediaCount
    });

    const albumDir = await fs.createFolderStructure(
      this.downloadBaseDir!,
      channelName,
      `album_${groupKey}`
    );
    const filePaths: string[] = [];

    for (const [index, message] of messages.entries()) {
      if (!message.media || !this.client) continue;

      let fileName = `media_${message.id}`;
      if (message.photo) fileName = `photo_${message.id}.jpg`;
      else if (message.video) fileName = `video_${message.id}.mp4`;
      else if (message.document) {
        const mimeType = message.document.mimeType.split('/')[1] || 'bin';
        fileName = `document_${message.id}.${mimeType}`;
      }

      const sanitizedFileName = fs.sanitizeFileName(fileName);
      const filePath = path.join(albumDir, sanitizedFileName);

      try {
        logger.info(
          `⬇️ Downloading album file ${index + 1}/${messages.length}: ${sanitizedFileName}`
        );
        const buffer = await this.client.downloadMedia(message.media, {});
        if (buffer && Buffer.isBuffer(buffer)) {
          await fs.saveFile(filePath, buffer);
          filePaths.push(
            path.join(
              this.downloadBaseDir!,
              fs.sanitizeFileName(channelName),
              `album_${groupKey}`,
              sanitizedFileName
            )
          );
          logger.info(`✅ Download complete: ${sanitizedFileName}`);
        }
      } catch (error) {
        logger.error(
          `❌ Failed to download album file ${sanitizedFileName}: ${error}`
        );
      }
    }

    const firstMessage = messages[0];
    const { tags } = extractTagsAndTitle(firstMessage.text);
    const cleanText = cleanTextForDb(firstMessage.text);
    const forwardUrl = generateForwardUrl(forward as any);

    await fs.saveAlbumMetadata(albumDir, {
      albumId: groupKey,
      messageIds: messages.map((m) => m.id.toString()),
      chatTitle: channelName,
      timestamp: new Date(firstMessage.date * 1000).toLocaleString(),
      forwardUrl,
      tags,
      text: cleanText || '',
      mediaCount: filePaths.length,
      messageId: firstMessage.id.toString()
    });

    await db.saveTelegramMessage({
      messageId: groupKey, // Use groupedId as the primary ID for the album
      chatId: (forward.chat as Api.Chat).id?.toString() || null,
      chatTitle: channelName,
      text: cleanText,
      tags,
      forwardUrl,
      mediaType: 'album',
      fileName: null,
      filePath: filePaths,
      mediaCount: filePaths.length
    });

    logger.info(
      `✅ Album processing complete. ${filePaths.length} files saved in: ${albumDir}`
    );
    delete this.albumMessages[groupKey];
  }

  private async processSingleMessage(message: Api.Message, forward: any) {
    const channelName = (forward.chat as Api.Chat).title || 'Unknown Channel';

    await broadcastToSSE({
      type: 'bot_log',
      level: 'info',
      message: `开始处理单条消息 #${message.id} 来自 ${channelName}`
    });

    const messageDir = await fs.createFolderStructure(
      this.downloadBaseDir!,
      channelName,
      `message_${message.id}`
    );

    const { tags, title } = extractTagsAndTitle(message.text);
    const cleanText = cleanTextForDb(message.text);
    const forwardUrl = generateForwardUrl(forward as any);

    await broadcastToSSE({
      type: 'bot_log',
      level: 'info',
      message: `保存消息元数据到 ${messageDir}`
    });

    // 保存消息元数据
    await fs.saveMessageMetadata(messageDir, {
      messageId: message.id.toString(),
      chatTitle: channelName,
      timestamp: new Date(message.date * 1000).toLocaleString(),
      forwardUrl,
      tags,
      text: title
    });

    // let filePath: string | null = null;
    // let fileName: string | null = null;
    // console.log(message.media);
    const filePaths: string[] = [];
    if (message.media && this.client) {
      const media = message.media as any;
      let fileName: string | null = null;
      if (media.document) {
        const attributes = media.document.attributes || [];
        // const fileNameAttr = attributes.find((attr: any) => attr.fileName);
        fileName = `document_${message.id}.${media.document?.mimeType?.split('/')[1]}`;
      } else if (media.photo) {
        fileName = `photo_${message.id}.jpg`;
      } else if (media.video) {
        fileName = `video_${message.id}.mp4`;
      } else {
        fileName = `media_${message.id}`;
      }
      // 文件名清洗
      fileName = fs.sanitizeFileNameForFile(fileName);
      // 文件保存路径 绝对路径
      const filePath = path.join(messageDir, fileName);

      await broadcastToSSE({
        type: 'bot_log',
        level: 'info',
        message: `开始下载媒体文件: ${fileName}`
      });

      // ... (Derive fileName similar to album logic) ...
      const buffer = await this.client.downloadMedia(message.media, {});
      if (buffer && Buffer.isBuffer(buffer)) {
        await fs.saveFile(filePath, buffer);
        filePaths.push(
          path.join(
            this.downloadBaseDir!,
            fs.sanitizeFileName(channelName),
            `message_${message.id}`,
            fileName
          )
        );

        await broadcastToSSE({
          type: 'download_complete',
          messageId: message.id.toString(),
          fileName,
          filePath, // relative path
          fileSize: buffer.length
        });
      }
    }

    await broadcastToSSE({
      type: 'bot_log',
      level: 'info',
      message: `保存消息记录到数据库`
    });

    await db.saveTelegramMessage({
      messageId: message.id.toString(),
      chatId: (forward.chat as Api.Chat).id?.toString() || null,
      chatTitle: channelName,
      text: cleanText,
      tags,
      forwardUrl, // 缺失
      mediaType: message.media?.className || null,
      fileName: null, // 缺失
      filePath: filePaths ? filePaths : [], // 缺失
      mediaCount: filePaths.length // 缺失
    });

    logger.info(`✅ 单个消息处理完成并保存到: ${messageDir}`);

    await broadcastToSSE({
      type: 'bot_log',
      level: 'info',
      message: `✅ 消息 #${message.id} 处理完成`
    });
  }
}
