import { db } from "@/lib/db";
import { getActiveClient } from "@/features/download/downloader/manager";
import { sseManager } from "@/lib/sse-manager";
import { getBatchClassificationInfo } from "@/lib/ai-provider";
import { TorrentAddOptions } from "@/types/download";
import { ensureMagnetLink } from "@/lib/magnet-helper";
import path from "path";

/**
 * 获取下载目录配置
 */
async function getMovieDownloadDirectoryConfig() {
  console.log(await getDownloadDirectoryConfigByType('movie'));

  return await getDownloadDirectoryConfigByType('movie');
}

async function getMagnetDownloadDirectoryConfig() {
  return await getDownloadDirectoryConfigByType('magnet');
}

async function getDownloadDirectoryConfigByType(type: string) {
  const setting = await db.setting.findUnique({
    where: { key: 'downloadDirectoryConfig' },
  });
  if (!setting) return null;
  if (!setting.value) return null;

  const obj = setting.value as any;

  for (const key in obj) {
    if (obj[key] && obj[key].mediaType === type) {
      return obj[key];
    }
  }

}

/**
 * 后台处理下载任务的函数
 * @param taskId - 用于 SSE 通信的唯一 ID
 * @param document - 已创建的文档对象
 * @param movieData - 电影数据（可选）
 */
export async function processDownloadTask(taskId: string, document: any, movieData: any = null) {
  console.log(`[Task ${taskId}] 开始处理下载任务`);

  try {
    const client = await getActiveClient();
    console.log(`[Task ${taskId}] 获取到下载器客户端`);
    console.log('--------------------------------');
    console.log(movieData);
    console.log('--------------------------------');

    // 获取下载目录配置



    // 第二阶段：提交到下载器
    console.log(`[Task ${taskId}] 开始提交到下载器`);
    sseManager.emit(taskId, { stage: 'DOWNLOAD_SUBMIT', message: '正在将任务提交到下载器...' });
    console.log(`[Task ${taskId}] DOWNLOAD_SUBMIT 消息已发送`);

    let successCount = 0;
    let failCount = 0;

    for (const downloadUrl of document.downloadURLs) {
      console.log(`[Task ${taskId}] 处理下载URL:`, downloadUrl.url);

      let torrentOptions: TorrentAddOptions = {};
      let folderName = '';

      if (movieData && movieData.type === 'javbus') {
        // folderName = movieData.id || 'unknown';
        const directoryConfig = await getMovieDownloadDirectoryConfig();
        const moviePath = path.join('/downloads', directoryConfig.downloadDir);
        torrentOptions.savepath = moviePath;
        torrentOptions.category = 'JAV';
        console.log(`[Task ${taskId}] JAV 类型，使用路径: ${moviePath}`);
      } else {
        const directoryConfig = await getMagnetDownloadDirectoryConfig();
        // 其他类型：使用 AI 分类或默认使用 adult 目录
        const originalName = downloadUrl.detail?.name;

        if (originalName) {
          // 有详细信息，尝试 AI 分类
          try {

            console.log(`[Task ${taskId}] 开始 AI 分类`);
            sseManager.emit(taskId, { stage: 'AI_START', message: `开始为任务获取 AI 分类...` });

            const classificationResults = await getBatchClassificationInfo([originalName]);
            console.log(`AI 分类完成`);
            sseManager.emit(taskId, { stage: 'AI_COMPLETE', message: 'AI 分类获取成功！', data: classificationResults });

            const classification = classificationResults[0];
            if (classification && classification.sourceCategory) {
              // AI 分类成功，构建路径：adult/分类/人名
              const pathParts = [classification.sourceCategory];
              if (classification.personName) {
                pathParts.push(classification.personName);
              }
              const aiPath = path.join(directoryConfig.downloadDir, ...pathParts);
              torrentOptions.savepath = aiPath;
              console.log(`[Task ${taskId}] AI 分类路径: ${aiPath}`);
            } else {
              // AI 分类没有生成有效路径，使用 adult 目录
              folderName = originalName;
              const adultPath = path.join(directoryConfig.downloadDir, folderName);
              torrentOptions.savepath = adultPath;
              console.log(`[Task ${taskId}] AI 分类无有效路径，使用 adult 目录: ${adultPath}`);
            }
          } catch (error) {
            console.error(`[Task ${taskId}] AI 分类失败:`, error);
            // AI 分类失败，使用 adult 目录
            folderName = originalName;
            const adultPath = path.join(directoryConfig.downloadDir, folderName);
            torrentOptions.savepath = adultPath;
            console.log(`[Task ${taskId}] AI 分类异常，使用 adult 目录: ${adultPath}`);
          }
        } else {
          // 没有详细信息，使用 adult 目录和默认名称
          folderName = document.title || 'unknown';
          const adultPath = path.join(directoryConfig.downloadDir, folderName);
          torrentOptions.savepath = adultPath;
          console.log(`[Task ${taskId}] 无详细信息，使用 adult 目录: ${adultPath}`);
        }
      }

      const fullUrl = ensureMagnetLink(downloadUrl.url);
      const result = await client.addTorrent(fullUrl, torrentOptions);

      if (result.success) {
        successCount++;

        try {
          await db.documentDownloadURL.update({
            where: { id: downloadUrl.id },
            data: { status: 'downloading' }
          });
          if (movieData && movieData.type === 'javbus') {
            await db.subscribeData.updateMany({
              where: { code: movieData.id },
              data: {
                status: 'downloading'
              }
            });
          }

        } catch (dbError) {
          console.error(`[Task ${taskId}] 更新数据库状态失败:`, dbError);
        }

        console.log(`[Task ${taskId}] 种子添加成功，发送 PROGRESS 消息`);
        sseManager.emit(taskId, {
          stage: 'PROGRESS',
          message: `成功提交任务: ${folderName || fullUrl}`,
          data: { total: document.downloadURLs.length, success: successCount, failed: failCount }
        });
      } else {
        failCount++;
        console.log(`[Task ${taskId}] 种子添加失败，发送 PROGRESS 消息`);
        sseManager.emit(taskId, {
          stage: 'PROGRESS',
          message: `提交任务失败: ${folderName || fullUrl} - ${result.message}`,
          data: { total: document.downloadURLs.length, success: successCount, failed: failCount }
        });
        console.error(`Failed to add torrent ${fullUrl}: ${result.message}`);
      }
    }

    const finalMessage = `任务提交完成。成功: ${successCount}，失败: ${failCount}。`;
    sseManager.emit(taskId, { stage: 'DONE', message: finalMessage });

  } catch (error: any) {
    console.error(`[Task ${taskId}] Error:`, error);
    sseManager.emit(taskId, { stage: 'ERROR', message: `处理失败: ${error.message}` });
  }
}
