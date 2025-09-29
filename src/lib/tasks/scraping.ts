import { Magnet } from '../../types/javbus';
import { getMovieMagnets } from '../javbus-parser';
import { extractBestMagnet } from '../download-processor';
import { sleep } from '../utils';
import { getPushService } from './utils';
import { db } from '@/lib/db';
import path from 'path';
import { getMovieDownloadDirectoryConfig } from '../download';
import { logger } from '../logger';
export async function taskMediaScraping() {
  const taskName = '媒体刮削';
  

  logger.info(`开始执行 ${taskName}`);
  try {
    const downloadedMovie = await db.subscribeData.findMany({
      where: {
        status: 'downloaded'
      }
    });
    if (!downloadedMovie || downloadedMovie.length === 0) {
      logger.info(`没有需要刮削的影片`);
      return;
    }
    const downloadDirectoryConfig = await getMovieDownloadDirectoryConfig();
    logger.info(`找到 ${downloadedMovie.length} 部已下载的影片`);
    // for (const movie  of downloadedMovie) {
    //   const moviePath = path.join(process.cwd(), 'media', downloadDirectoryConfig.downloadDir, torrent.name);
    // }
    // if (downloadUrl.type === 'movie') {
      // const moviePath = path.join(process.cwd(), 'media', downloadDirectoryConfig.downloadDir, torrent.name);
      // const videoFiles = await findVideoFiles(moviePath, parseConfig.cleanupExtensions, parseConfig.cleanupFilenameContains, 100);
      // for (const videoFile of videoFiles) {
      //     const fileInfo = await getFileInfo(videoFile);
      //     const fileTransfer = await db.fileTransferLog.create({
      //         data: {
      //             title: fileInfo.fileName,
      //             number: null,
      //             sourcePath: videoFile,
      //             destinationPath: '',
      //             status: TransferStatus.PROCESSING,
      //             transferMethod: downloadDirectoryConfig.organizeMethod.toUpperCase() as TransferMethod,
      //         },
      //     });
      //     await manualTransfer({ id: videoFile, name: fileInfo.fileName }, fileInfo.number, downloadDirectoryConfig.organizeMethod.toUpperCase() as TransferMethod, fileTransfer.id);
      // }
  // }

  } catch (error) {
    logger.error(`[${taskName}] 执行失败: ${error}`);
  } finally {
    logger.info(`[${taskName}] 执行完成`);
  }
}
