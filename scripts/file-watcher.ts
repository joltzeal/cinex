import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import { Document, DocumentDownloadURL } from '@prisma/client';
// 使用 require 导入来避免路径解析问题
let db: any;
let getFileInfo: any;
let monitorTransfer: any;

const loadModules = async () => {
  try {
    const dbModule = require('../dist/src/lib/db');
    db = dbModule.db;
    
    const fileInfoModule = require('../dist/src/lib/parse/get-file-info');
    getFileInfo = fileInfoModule.getFileInfo;
    
    const transferModule = require('../dist/src/lib/transfer');
    monitorTransfer = transferModule.monitorTransfer;
  } catch (error) {
    console.error('Failed to load modules:', error);
    throw error;
  }
};
// 假设 file-matcher.ts 导出一个具有静态方法的类
// 您需要为 FileMatcher 创建或导入类型定义
// 这里我们先做一个临时的定义
interface FileMatcher {
  matchFile(filePath: string, fileName: string, fileStats: fs.Stats): Promise<DocumentDownloadURL | null>;
}
const FileMatcher: FileMatcher = {
  async matchFile(filePath, fileName, fileStats) {
    // 在这里实现您的真实匹配逻辑
    console.log("Matching file, this is a placeholder implementation.");
    return null;
  }
};


// 初始化 Prisma 客户端

/**
 * 使用 Prisma 直接操作数据库
 */
async function handleFileWithPrisma(filePath: string, fileName: string, fileStats: fs.Stats): Promise<void> {
  try {
    // 1. 获取下载目录配置 (假设配置值是 JSON)
    const directoryConfig = await db.setting.findUnique({
      where: { key: 'downloadDirectoryConfig' }
    });

    console.log(`[File-Watcher] 下载目录配置:`, directoryConfig?.value);

    // 2. 使用文件匹配工具查找匹配的下载记录
    const downloadUrl = await FileMatcher.matchFile(filePath, fileName, fileStats);

    if (downloadUrl) {
      console.log(`[File-Watcher] 找到匹配的下载记录:`, downloadUrl.id);

      // 3. 更新下载状态为已完成
      await db.documentDownloadURL.update({
        where: { id: downloadUrl.id },
        data: {
          status: 'downloaded'
        }
      });

      // 4. 更新文档信息（添加文件路径到图片数组）
      await db.document.update({
        where: { id: downloadUrl.documentId },
        data: {
          images: {
            push: filePath
          }
        }
      });

      // 5. 如果有订阅数据，更新订阅状态
      if (downloadUrl.subscribeDataIds && Array.isArray(downloadUrl.subscribeDataIds)) {
        const subscribeDataIds = downloadUrl.subscribeDataIds as string[]; // 类型断言
        if (subscribeDataIds.length > 0) {
          await db.subscribeData.updateMany({
            where: {
              id: { in: subscribeDataIds }
            },
            data: {
              status: 'downloaded'
            }
          });
          console.log(`[File-Watcher] 更新了 ${subscribeDataIds.length} 个订阅记录`);
        }
      }

      console.log(`[File-Watcher] ✅ 数据库更新成功: ${fileName}`);
    } else {
      console.log(`[File-Watcher] ⚠️ 未找到匹配的下载记录: ${fileName}`);
      // await createNewDocumentRecord(filePath, fileName, fileStats);
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[File-Watcher] 数据库操作失败: ${message}`);
    throw error;
  }
}

/**
 * 创建新的文档记录（可选功能）
 */
async function createNewDocumentRecord(filePath: string, fileName: string, fileStats: fs.Stats): Promise<Document> {
  try {
    const newDocument = await db.document.create({
      data: {
        title: fileName,
        description: `自动检测到的文件: ${fileName}`,
        images: [filePath],
        downloadURLs: {
          create: {
            url: `file://${filePath}`,
            status: 'downloaded'
          }
        }
      }
    });

    console.log(`[File-Watcher] 创建了新文档记录: ${newDocument.id}`);
    return newDocument;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[File-Watcher] 创建文档记录失败: ${message}`);
    throw error;
  }
}

/**
 * 通知前端（可选）
 */
async function notifyFrontend(filePath: string, fileName: string): Promise<void> {
  try {
    const response = await fetch('http://localhost:3000/api/download/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filePath: filePath,
        fileName: fileName,
        action: 'file_completed'
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[File-Watcher] 前端通知成功:`, data);
    } else {
      console.log(`[File-Watcher] 前端通知失败: ${response.status}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[File-Watcher] 前端通知错误: ${message}`);
  }
}

/**
 * 启动文件监视器
 */
export async function startFileWatcher(): Promise<void> {
  console.log('[File-Watcher] 目录监控运行中');
  
  // 先加载必要的模块
  await loadModules();

  const downloadDirectoryConfig = await db.setting.findUnique({
    where: { key: 'downloadDirectoryConfig' }
  });

  console.log(downloadDirectoryConfig?.value);

  if (!downloadDirectoryConfig?.value) {
    console.log('[File-Watcher] 下载目录配置未找到');
    return;
  }
  let dirs: string[] = [];
  // 确保 downloadDirectoryConfig.value 是一个可迭代的对象
  if (typeof downloadDirectoryConfig.value === 'object' && downloadDirectoryConfig.value !== null) {
    Object.values(downloadDirectoryConfig.value).forEach((directory: any) => {
      if (directory.mediaType === 'movie' && directory.downloadDir) {
        const downloadsDir = path.join(process.cwd(), directory.downloadDir);
        // 确保目录存在
        if (fs.existsSync(downloadsDir)) {
          dirs.push(downloadsDir);
        } else {
          console.warn(`[File-Watcher] 目录不存在，已跳过：${downloadsDir}`);
        }
      }
    });
  }

  if (dirs.length === 0) {
    console.log('[File-Watcher] 没有需要监控的有效目录');
    return;
  }

  console.log('[File-Watcher] 正在监控以下目录:', dirs);

  const watcher = chokidar.watch(dirs, {
    ignored: /(^|[\/\\])\../, // 忽略点文件 (例如 .DS_Store)
    persistent: true,
    ignoreInitial: true, // 忽略初始扫描时已存在的文件
    awaitWriteFinish: { // 等待文件写入完成
      stabilityThreshold: 2000,
      pollInterval: 100,
    },
  });

  watcher
    .on('add', async (filePath) => {
      // 忽略 qBittorrent 的临时文件
      if (filePath.endsWith('!qB')) {
        console.log(`[File-Watcher] 忽略下载中的文件: ${filePath}`);
        return;
      }

      // 假设视频文件后缀
      const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv'];
      const fileExt = path.extname(filePath).toLowerCase();

      if (videoExtensions.includes(fileExt)) {
        fs.stat(filePath, (err, stats) => {
          if (err) {
            console.error(`[File-Watcher] 无法获取文件状态: ${filePath}`, err);
            return;
          }

          const fileSizeInMB = stats.size / (1024 * 1024);
          if (fileSizeInMB > 100) {
            console.log(`[File-Watcher] 检测到新的大于100MB的视频文件: ${filePath}`);
            getFileInfo(filePath).then(
              (fileInfo: any) => {
                console.log(fileInfo);
                if (fileInfo.number && fileInfo.letters) {
                  monitorTransfer(filePath, fileInfo.number).then(
                    () => {
                      console.log(`[File-Watcher] 转移成功: ${filePath}`);
                    }
                  ).catch(
                    (error: any) => {
                      console.log(`[File-Watcher] 转移失败: ${filePath}`, error);
                    }
                  );
                }
              }
            );
            
            // 在这里添加你想要执行的逻辑，例如：
            // - 将文件信息写入数据库
            // - 触发媒体库扫描等
            // processNewVideoFile(filePath);
          } else {
            console.log(`[File-Watcher] 文件大小未超过100MB，已忽略: ${filePath}`);
          }
        });
      }
    })
    .on('error', (error) => console.error(`[File-Watcher] 发生错误: ${error}`))
    .on('ready', () => console.log('[File-Watcher] 初始扫描完成，准备好监控文件改动'));

  watcher.on('error', (error: any) => console.error(`[File-Watcher] 发生错误: ${error.message}`));
  watcher.on('ready', () => console.log('[File-Watcher] 文件监听器已启动，正在等待新文件事件...'));
}
