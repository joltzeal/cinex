const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

function getProxyConfigFromEnv() {
  const proxyEnv =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.ALL_PROXY ||
    process.env.all_proxy;

  if (!proxyEnv) {
    return undefined; // 没有代理，返回 undefined
  }

  try {
    const proxyUrl = new URL(proxyEnv);
    const proxy = {
      ip: proxyUrl.hostname, // Proxy host (IP or hostname)
      port: parseInt(proxyUrl.port, 10), // Proxy port
      socksType: 5, // If used Socks you can choose 4 or 5.
      timeout: 10, // Timeout (in seconds) for connection,
    };

    return proxy;
  } catch (error) {
    console.error(`❌ 无效的代理URL: "${proxyEnv}"。将忽略代理设置。`, error);
    return undefined;
  }
}
// 配置
const prisma = new PrismaClient();
const TELEGRAM_CONFIG_KEY = 'telegramConfig';
let DOWNLOAD_BASE_DIR = null;

// 从数据库获取下载目录配置
async function getDownloadDirectory() {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'downloadDirectoryConfig' },
    });
    
    if (!setting || !setting.value) {
      console.log('❌ 下载目录配置未找到');
      return null;
    }

    const obj = setting.value;
    
    // 查找 mediaType 为 'telegram' 的配置
    for (const key in obj) {
      if (obj[key] && obj[key].mediaType === 'telegram') {
        const downloadDir = obj[key].downloadDir;
        if (downloadDir) {
          // 创建相对于项目根目录的完整路径
          const fullPath = path.resolve(__dirname, '..', '..', 'media', downloadDir);
          console.log(`📁 Telegram下载目录: ${fullPath}`);
          return fullPath;
        }
      }
    }
    
    console.log('❌ 未找到 Telegram 类型的下载目录配置');
    return null;
  } catch (error) {
    console.error('❌ 获取下载目录配置失败:', error);
    return null;
  }
}

// 全局变量
let globalClient = null;
let isShuttingDown = false;
let processedGroups = new Set(); // 跟踪已处理的相册组
let processedMessages = new Set(); // 跟踪已处理的单个消息，防止重复处理
let broadcastedDownloads = new Set(); // 跟踪已广播的下载完成消息

// SSE 连接管理
const sseConnections = new Set();

// 保存session到数据库
async function saveSessionToDb(sessionString) {
  try {
    const currentSettings = await prisma.setting.findUnique({
      where: { key: TELEGRAM_CONFIG_KEY },
    });

    if (currentSettings) {
      const newSettingsValue = {
        ...currentSettings.value,
        session: sessionString,
      };
      await prisma.setting.update({
        where: { key: TELEGRAM_CONFIG_KEY },
        data: { value: newSettingsValue },
      });
      console.log('Session 已成功保存到数据库');
    }
  } catch (error) {
    console.error('保存 session 到数据库失败:', error);
  }
}

// 从消息文本中提取标签和标题
function extractTagsAndTitle(text) {
  if (!text) return { tags: [], title: '' };

  const tags = [];
  const hashtagMatches = text.match(/#(\w+)/g);
  if (hashtagMatches) {
    tags.push(...hashtagMatches.map(tag => tag.substring(1)));
  }

  const title = text.replace(/#(\w+)/g, '').trim();
  return { tags, title };
}

// 生成转发来源URL
function generateForwardUrl(forwardInfo) {
  try {
    if (!forwardInfo) return null;

    const chat = forwardInfo.chat;
    const messageId = forwardInfo.channelPost || forwardInfo.savedFromMsgId;

    if (chat && chat.username && messageId) {
      return `https://t.me/${chat.username}/${messageId}`;
    } else if (chat && messageId) {
      return `https://t.me/c/${chat.id}/${messageId}`;
    }
  } catch (error) {
    console.error('生成转发URL失败:', error);
  }
  return null;
}

// 创建文件夹结构
function createFolderStructure(channelName, messageId) {
  const channelDir = path.join(process.cwd(), 'media', DOWNLOAD_BASE_DIR, sanitizeFileName(channelName));
  const messageDir = path.join(channelDir, `message_${messageId}`);

  fs.mkdirSync(channelDir, { recursive: true });
  fs.mkdirSync(messageDir, { recursive: true });

  return { channelDir, messageDir };
}

// 清理文件名
function sanitizeFileName(name) {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

// 保存消息元数据到txt文件
async function saveMessageMetadata(messageDir, metadata) {
  try {
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

    fs.writeFileSync(metadataPath, content, 'utf8');
    console.log(`💾 元数据已保存: ${metadataPath}`);
  } catch (error) {
    console.error('保存元数据失败:', error);
  }
}

// 优雅关闭函数
async function gracefulShutdown() {
  console.log('正在优雅关闭Telegram客户端...');
  isShuttingDown = true;

  if (globalClient) {
    try {
      await globalClient.disconnect();
      console.log('Telegram客户端已断开连接');
    } catch (error) {
      console.error('断开Telegram客户端连接时出错:', error);
    }
  }

  await prisma.$disconnect();
  process.exit(0);
}

// 监听进程信号
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// 主启动函数
async function startTelegramBot() {
  try {
    console.log('🚀 正在启动Telegram Bot...');
    
    // 先获取下载目录配置
    DOWNLOAD_BASE_DIR = await getDownloadDirectory();
    if (!DOWNLOAD_BASE_DIR) {
      console.log('❌ 无法获取Telegram下载目录配置，跳过启动');
      return false;
    }
    
    // 确保下载目录存在
    try {
      fs.mkdirSync(path.join(process.cwd(), 'media', DOWNLOAD_BASE_DIR), { recursive: true });
      console.log('📁 下载目录已创建:', DOWNLOAD_BASE_DIR);
    } catch (error) {
      console.error('❌ 创建下载目录失败:', error);
      return false;
    }

    const configFromDb = await prisma.setting.findUnique({
      where: { key: TELEGRAM_CONFIG_KEY },
    });

    // 检查配置
    if (!configFromDb || !configFromDb.value.enabled) {
      console.log('❌ Telegram功能未启用或未配置');
      return false;
    }

    
    

    const { apiId, apiHash, botToken, session } = configFromDb.value;
    const proxyConfig = getProxyConfigFromEnv();
    if (!apiId || !apiHash || !botToken) {
      console.error('❌ 配置不完整：需要API_ID、API_HASH和BOT_TOKEN');
      return false;
    }

    console.log('✅ 配置检查通过，正在启动Bot...');

    // 使用Bot Token启动
    const stringSession = new StringSession(session || '');
    const client = new TelegramClient(stringSession, parseInt(apiId, 10), apiHash, {
      connectionRetries: 5,
      useWSS: false, // Important. Most proxies cannot use SSL.
      proxy:  proxyConfig,
    });

    await client.start({
      botAuthToken: botToken,
      onError: (err) => console.log('连接错误:', err),
    });

    console.log('✅ Bot已连接');
    globalClient = client;

    // 保存session
    const currentSession = client.session.save();
    if (currentSession && currentSession !== session) {
      console.log('💾 保存新session到数据库...');
      await saveSessionToDb(currentSession);
    }

    // 获取Bot信息
    const me = await client.getMe();
    console.log(`🤖 Bot信息: ${me.firstName} (@${me.username})`);
    console.log(`🆔 Bot ID: ${me.id}`);

    // 设置消息监听器
    console.log('📡 设置消息监听器...');

    // 监听所有转发消息（包括单个消息和相册）
    client.addEventHandler(handleForwardedMessage, new NewMessage({
      incoming: true,
      outgoing: false,
      func: (event) => event.message.forward // 只处理转发消息
    }));

    console.log('✅ 监听器设置完成');
    console.log('🔄 正在监听转发消息...');
    console.log('📝 请向Bot转发消息来测试功能');

    return true;
  } catch (error) {
    console.error('❌ 启动Bot失败:', error);
    return false;
  }
}

// 全局变量用于跟踪相册消息
const albumMessages = {}; // groupedId -> messages array

// 处理转发消息（统一处理单个消息和相册）
async function handleForwardedMessage(event) {
  if (isShuttingDown) return;

  try {

    const message = event.message;


    const forward = message.forward;

    if (!forward) {
      console.log('⚠️ 收到非转发消息，跳过');
      return;
    }


    const channelName = forward.chat?.title || 'Unknown Channel';
    const groupedId = message.groupedId;

    if (groupedId) {
      // 相册消息处理
      console.log(`\n📨 收到转发的相册消息 (组ID: ${groupedId})`);

      // 转换为字符串确保键的一致性
      const groupKey = groupedId.toString();

      // 检查是否已存在该相册组
      if (!albumMessages[groupKey]) {
        console.log(`创建新的相册消息组: ${groupKey}`);
        albumMessages[groupKey] = [];

        // 只在第一次创建时设置延迟处理
        setTimeout(async () => {
          const messages = albumMessages[groupKey];
          if (messages && messages.length > 0) {
            console.log('--------------------------------');
            console.log(`处理相册，共 ${messages.length} 个消息`);
            console.log('--------------------------------');

            // 统计媒体数量
            const mediaCount = messages.filter(msg => msg.media).length;
            console.log(`频道: ${channelName}, 媒体数量: ${mediaCount}`);

            // 广播新消息接收通知（只广播一次）
            await broadcastToSSE({
              type: 'new_message',
              messageId: messages[0].id.toString(),
              channelName: channelName,
              text: messages[0].text || '',
              hasMedia: mediaCount > 0,
              mediaCount: mediaCount,
              mediaType: 'album'
            });

            // 处理相册中的所有消息，统一保存在一个文件夹中
            const filePaths = await processAlbumMessages(messages, forward, channelName, groupKey);

            // 清理
            delete albumMessages[groupKey];
            console.log(`相册处理完成，已清理组ID: ${groupKey}`);
          }
        }, 1000); // 1秒后处理，确保收集完所有消息
      }

      // 添加消息到相册组
      albumMessages[groupKey].push(message);
      console.log(`相册组 ${groupKey} 当前消息数量: ${albumMessages[groupKey].length}`);

    } else {
      // 单个消息
      const messageKey = `${message.id}_${message.chatId || 'unknown'}`;

      // 检查是否已经处理过这个消息
      if (processedMessages.has(messageKey)) {
        console.log(`⚠️ 消息已处理，跳过: ${messageKey}`);
        return;
      }

      // 标记消息为已处理
      processedMessages.add(messageKey);

      console.log('\n📨 收到转发的单个消息');

      // 广播新消息接收通知
      await broadcastToSSE({
        type: 'new_message',
        messageId: message.id.toString(),
        channelName: channelName,
        text: message.text || '',
        hasMedia: !!message.media,
        mediaCount: message.media ? 1 : 0,
        mediaType: message.media?.className || null
      });

      await processSingleMessage(message, forward, false);

      // 处理完成后从集合中移除（可选，防止内存泄漏）
      setTimeout(() => {
        processedMessages.delete(messageKey);
      }, 60000); // 1分钟后清理
    }

  } catch (error) {
    console.error('❌ 处理转发消息失败:', error);
  }
}

// 处理相册消息
async function processAlbumMessages(messages, forward, channelName, groupKey) {
  const forwardChat = forward.chat;
  const cleanChannelName = sanitizeFileName(channelName);

  // 创建以 groupedId 为名称的文件夹
  const telegramDir = path.join(process.cwd(), 'media', DOWNLOAD_BASE_DIR);
  const albumDir = path.join(telegramDir, cleanChannelName, `album_${groupKey}`);
  fs.mkdirSync(albumDir, { recursive: true });

  const filePaths = [];

  // 处理相册中的每个媒体文件
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    if (message.media) {
      try {
        // 获取媒体信息和文件名
        const media = message.media;
        let fileName = '';

        if (media.document) {
          const attributes = media.document.attributes || [];
          const fileNameAttr = attributes.find(attr => attr.fileName);
          fileName = fileNameAttr ? fileNameAttr.fileName : `document_${message.id}`;
        } else if (media.photo) {
          fileName = `photo_${message.id}.jpg`;
        } else if (media.video) {
          fileName = `video_${message.id}.mp4`;
        } else {
          fileName = `media_${message.id}`;
        }

        // 清理文件名
        fileName = sanitizeFileName(fileName);
        const filePath = path.join(albumDir, fileName);

        console.log(`⬇️ 开始下载相册文件 ${i + 1}/${messages.length}: ${fileName}`);

        // 下载媒体文件
        const buffer = await globalClient.downloadMedia(media, {
          workers: 1,
          progressCallback: (downloaded, total) => {
            // 不再广播下载进度
          }
        });

        if (buffer) {
          // 保存文件
          fs.writeFileSync(filePath, buffer);

          // 计算相对路径
          const relativePath = path.relative(path.resolve(__dirname, '..', '..'), filePath);
          filePaths.push(relativePath);

          console.log(`✅ 相册文件已下载: ${fileName} (${buffer.length} bytes)`);
        }
      } catch (downloadError) {
        console.error(`❌ 下载相册文件失败:`, downloadError);
      }
    }
  }

  // 保存相册元数据
  const firstMessage = messages[0];
  const cleanText = cleanTextForDb(firstMessage.text);
  const { tags } = extractTagsAndTitle(firstMessage.text);
  const forwardUrl = generateForwardUrl(forward);

  const metadataPath = path.join(albumDir, 'metadata.txt');
  const metadata = {
    albumId: groupKey,
    messageIds: messages.map(m => m.id.toString()),
    chatTitle: channelName,
    timestamp: new Date(firstMessage.date * 1000).toLocaleString(),
    forwardUrl,
    tags,
    text: cleanText || '',
    mediaCount: filePaths.length
  };

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

  fs.writeFileSync(metadataPath, content, 'utf8');
  console.log(`💾 相册元数据已保存: ${metadataPath}`);

  // 保存到数据库（只保存一条记录）
  await saveTelegramMessage({
    messageId: groupKey, // 使用 groupedId 作为消息ID
    chatId: forwardChat?.id?.toString() || null,
    chatTitle: channelName,
    text: cleanText,
    tags,
    forwardUrl,
    mediaType: 'album',
    fileName: null, // 相册没有单一文件名
    filePath: filePaths, // 数组形式保存所有文件路径
    mediaCount: filePaths.length
  });

  console.log(`✅ 相册消息已处理，共 ${filePaths.length} 个文件保存到: ${albumDir}`);
  return filePaths;
}

// 处理单个消息
async function processSingleMessage(message, forward, isPartOfAlbum = false) {
  const forwardChat = forward.chat;
  const channelName = sanitizeFileName(forwardChat?.title || 'Unknown Channel');
  const forwardUrl = generateForwardUrl(forward);

  console.log(`📍 来源频道: ${channelName}`);
  console.log(`🔗 转发URL: ${forwardUrl || '无'}`);

  // 提取标签和标题
  const { tags, title } = extractTagsAndTitle(message.text);
  console.log(`🏷️ 标签: ${tags.join(', ') || '无'}`);
  console.log(`📝 标题: ${title || '无'}`);

  // 创建文件夹结构
  const { messageDir } = createFolderStructure(channelName, message.id);

  // 准备元数据（清理特殊字符）
  const cleanText = cleanTextForDb(message.text);
  const metadata = {
    messageId: message.id.toString(),
    chatTitle: channelName,
    timestamp: new Date(message.date * 1000).toLocaleString(),
    forwardUrl,
    tags,
    text: cleanText || ''
  };

  // 保存元数据
  await saveMessageMetadata(messageDir, metadata);

  // 下载媒体文件
  let downloadedFile = null;
  let mediaInfo = null;

  if (message.media) {
    try {
      // 获取媒体信息
      const media = message.media;
      let fileName = '';

      if (media.document) {
        // 文档类型媒体
        const attributes = media.document.attributes || [];
        const fileNameAttr = attributes.find(attr => attr.fileName);
        fileName = fileNameAttr ? fileNameAttr.fileName : `document_${message.id}`;
        mediaInfo = {
          type: 'document',
          size: media.document.size,
          mimeType: media.document.mimeType
        };
      } else if (media.photo) {
        // 图片类型媒体
        fileName = `photo_${message.id}.jpg`;
        mediaInfo = {
          type: 'photo',
          size: null
        };
      } else if (media.video) {
        // 视频类型媒体
        fileName = `video_${message.id}.mp4`;
        mediaInfo = {
          type: 'video',
          size: media.video.size
        };
      } else {
        fileName = `media_${message.id}`;
        mediaInfo = {
          type: 'unknown',
          size: null
        };
      }

      // 清理文件名
      fileName = sanitizeFileName(fileName);
      const filePath = path.join(messageDir, fileName);

      console.log(`⬇️ 开始下载文件: ${fileName}`);

      // 使用正确的 downloadMedia API
      const buffer = await globalClient.downloadMedia(media, {
        workers: 1,
        progressCallback: (downloaded, total) => {
          // 不再广播下载进度
        }
      });

      if (buffer) {
        // 保存文件
        fs.writeFileSync(filePath, buffer);
        downloadedFile = filePath;

        // 计算相对路径（相对于项目根目录）
        const relativePath = path.relative(path.resolve(__dirname, '..', '..'), filePath);

        // 广播下载完成消息
        await broadcastToSSE({
          type: 'download_complete',
          messageId: message.id.toString(),
          fileName,
          filePath: relativePath,
          fileSize: buffer.length
        });

        console.log(`✅ 文件已下载: ${fileName} (${buffer.length} bytes)`);
        console.log(`📁 相对路径: ${relativePath}`);
      }
    } catch (downloadError) {
      console.error('❌ 下载失败:', downloadError);

      // 不再广播下载错误消息

      return;
    }
  }

  // 保存到数据库（单个消息也使用数组保存 filePath）
  const relativePath = downloadedFile ?
    path.relative(path.resolve(__dirname, '..', '..'), downloadedFile) :
    path.relative(path.resolve(__dirname, '..', '..'), messageDir);

  const filePaths = downloadedFile ? [relativePath] : [];

  await saveTelegramMessage({
    messageId: message.id.toString(),
    chatId: forwardChat?.id?.toString() || null,
    chatTitle: channelName,
    text: cleanText,
    tags,
    forwardUrl,
    mediaType: message.media ? message.media.className : null,
    fileName: downloadedFile ? path.basename(downloadedFile) : null,
    filePath: filePaths, // 使用数组，单个文件时长度为1
    mediaCount: filePaths.length
  });

  if (isPartOfAlbum) {
    console.log(`✅ 相册消息已处理并保存到: ${channelName}/message_${message.id}`);
  } else {
    console.log(`✅ 单个消息已处理并保存到: ${channelName}/message_${message.id}`);
  }
}


// 清理文本中的无效UTF8字符
function cleanTextForDb(text) {
  if (!text) return null;
  // 移除控制字符、空字符和无效UTF8字符
  return text.replace(/[\x00-\x1F\x7F-\x9F\uFFFD\u0000]/g, '').trim() || null;
}

// 广播消息到所有SSE连接
async function broadcastToSSE(message) {
  try {
    // 获取应用端口，默认3000
    const port = process.env.PORT || 3000;
    const url = `http://localhost:${port}/api/telegram/broadcast`;
    
    // 使用 HTTP 请求广播消息到 SSE 连接
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...message,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`广播请求失败: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log(`📡 广播消息成功: ${message.type}`);
  } catch (error) {
    // 如果是网络错误（Next.js可能还未启动），静默处理
    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
      console.log(`📡 [离线广播] ${message.type}: ${message.message || JSON.stringify(message)}`);
    } else {
      console.error('广播消息失败:', error);
      console.log(`📡 [${message.type}] ${JSON.stringify(message)}`);
    }
  }
}

// 保存Telegram消息到数据库
async function saveTelegramMessage(messageData) {
  try {
    const cleanData = {
      messageId: messageData.messageId,
      chatId: messageData.chatId,
      chatTitle: cleanTextForDb(messageData.chatTitle),
      text: cleanTextForDb(messageData.text),
      tags: messageData.tags || [],
      forwardUrl: messageData.forwardUrl,
      mediaType: messageData.mediaType,
      fileName: cleanTextForDb(messageData.fileName),
      filePath: messageData.filePath || [], // 支持数组形式
      mediaCount: messageData.mediaCount || 0, // 添加媒体数量字段
      processed: true
    };

    await prisma.telegramMessage.create({
      data: cleanData,
    });

    const fileCount = Array.isArray(cleanData.filePath) ? cleanData.filePath.length : 1;
    console.log(`💾 消息已保存到数据库: ${messageData.messageId} (${fileCount} 个文件)`);
  } catch (error) {
    if (error.code === 'P2002') {
      console.log(`⚠️ 消息已存在: ${messageData.messageId}`);
    } else {
      console.error('保存消息到数据库失败:', error);
      console.error('错误详情:', error.message);
    }
  }
}

// 导出函数
module.exports = {
  startTelegramBot,
  gracefulShutdown,
  saveTelegramMessage,
  extractTagsAndTitle,
  generateForwardUrl,
  sseConnections,
  broadcastToSSE
};

// 如果直接运行此文件，则启动bot
if (require.main === module) {
  startTelegramBot().catch(console.error);
}