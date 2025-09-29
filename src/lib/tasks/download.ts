import { getActiveClient } from '../../features/download/downloader/manager';
import { extractHash } from '../magnet-helper';
import { getPushService } from './utils';
import { db } from '../db';
import { getMovieParseConfig, manualTransfer } from '../transfer';
// import { TransferMethod, TransferStatus } from '@prisma/client';
import { getFileInfo } from '../parse/get-file-info';
import { getMovieDownloadDirectoryConfig } from '../download';
import { findVideoFiles } from '../parse/file';
import path from 'path';
import { logger } from '../logger';
import { TransferMethod, TransferStatus } from '@prisma/client';

export async function taskDownloadStatusSync() {
    const taskName = '下载状态同步';
    logger.info(`开始执行 ${taskName}`);

    try {
        // 获取活跃的下载器客户端
        let client;
        try {
            client = await getActiveClient();
        } catch (error) {
            logger.info(`获取下载器客户端失败: ${error}`);
            return;
        }

        // 获取下载器中的所有种子
        const torrents = await client.getTorrents();

        logger.info(torrents);



        // 创建哈希到种子状态的映射
        const torrentStatusMap = new Map<string, any>();
        for (const torrent of torrents) {
            if (torrent.hash) {
                torrentStatusMap.set(torrent.hash.toLowerCase(), torrent);
            }
        }
        const downloadDirectoryConfig = await getMovieDownloadDirectoryConfig();
        // 获取数据库中所有需要检查的记录（包括下载中、暂停、检查中等状态）
        const allDownloadUrls = await db.documentDownloadURL.findMany({
            where: {
                status: {
                    in: ['downloading', 'paused', 'checking', 'error', 'downloaded']
                }
            },
            include: { document: true }
        });

        logger.info(`数据库中有 ${allDownloadUrls.length} 个需要检查的下载记录`);

        let updatedCount = 0;
        let completedCount = 0;
        let undownloadedCount = 0;

        const parseConfig = await getMovieParseConfig();

        // 遍历数据库中的记录，更新状态
        for (const downloadUrl of allDownloadUrls) {
            const hash = downloadUrl.hash || extractHash(downloadUrl.url);
            if (!hash) {
                logger.warn(`无法从URL提取哈希: ${downloadUrl.url}`);
                continue;
            }

            const torrent = torrentStatusMap.get(hash.toLowerCase());

            if (!torrent) {
                // 种子不在下载器中，标记为未下载
                logger.info(`种子不在下载器中，标记为未下载: ${hash}`);
                await db.documentDownloadURL.update({
                    where: { id: downloadUrl.id },
                    data: { status: 'undownload' }
                });
                undownloadedCount++;
                updatedCount++;
            } else {
                // 下载器状态[paused, downloading, checking, error, completed, stalled]
                // download status [undownload, downloading, downloaded, paused, checking, error]
                // subscribe data 下载状态[uncheck, checked, undownload, downloading, downloaded, added, subscribed] 但是不应修改，只有undownload, downloading, downloaded 三个状态可以修改
                let torrentStatus = torrent.status;
                let torrentProgress = torrent.progress;
                let documentDownloadStatus;  // 可能包含除movie 外的其他下载任务
                let subscribeDataStatus; // movie 下载任务

                // let newStatus;
                logger.info(torrentStatus);

                // 更新 documentDownloadStatus
                if (torrentProgress >= 100) {
                    documentDownloadStatus = 'downloaded';
                    subscribeDataStatus = 'downloaded';
                    completedCount++;
                } else if (torrentStatus === 'downloading') {
                    documentDownloadStatus = 'downloading';
                    subscribeDataStatus = 'downloading';
                } else if (torrentStatus === 'stalled') {
                    documentDownloadStatus = 'downloading';
                    subscribeDataStatus = 'downloading';
                } else if (torrentStatus === 'paused' && torrentProgress < 100) {
                    documentDownloadStatus = 'paused';
                } else if (torrentStatus === 'checking') {
                    documentDownloadStatus = 'checking';
                } else if (torrentStatus === 'error') {
                    documentDownloadStatus = 'error';
                }

                if (documentDownloadStatus) {
                    await db.documentDownloadURL.update({
                        where: { id: downloadUrl.id },
                        data: { status: documentDownloadStatus as any }
                    });
                }

                if (downloadUrl.subscribeDataIds && subscribeDataStatus) {
                    try {
                        const subscribeDataIds = downloadUrl.subscribeDataIds as string[];
                        if (Array.isArray(subscribeDataIds) && subscribeDataIds.length > 0) {
                            await db.subscribeData.updateMany({
                                where: {
                                    id: { in: subscribeDataIds }
                                },
                                data: {
                                    status: subscribeDataStatus as any
                                }
                            });

                            logger.info(`同步更新了 ${subscribeDataIds.length} 个 SubscribeData 记录的状态为: ${subscribeDataStatus}`);
                        }
                    } catch (error) {
                        logger.error(`同步更新 SubscribeData 状态失败: ${error}`);
                    }
                }

                if (documentDownloadStatus === 'downloaded' && downloadUrl.type === 'movie') {
                    const sourcePath = torrent.contentPath || torrent.rootPath;
                    const relativePath = path.normalize(sourcePath.replace(/^\/downloads/, ''));
                    const finalSavePath = path.join(process.cwd(), 'media', relativePath);
                    logger.info(finalSavePath);
                    const videoFiles = await findVideoFiles(finalSavePath, parseConfig!.cleanupExtensions, parseConfig!.cleanupFilenameContains);
                    for (const videoFile of videoFiles) {
                        const fileInfo = await getFileInfo(videoFile);
                        logger.info(fileInfo);
                        const fileTransfer = await db.fileTransferLog.create({
                            data: {
                                title: fileInfo.fileName,
                                number: null,
                                sourcePath: videoFile,
                                destinationPath: '',
                                status: TransferStatus.PROCESSING,
                                transferMethod: downloadDirectoryConfig!.organizeMethod.toUpperCase() as TransferMethod,
                            },
                        });
                        await manualTransfer({ file: { id: videoFile, name: fileInfo.fileName }, number: fileInfo.number, transferMethod: downloadDirectoryConfig!.organizeMethod.toUpperCase() as TransferMethod, fileTransferLogId: fileTransfer.id ,subscribeDataIds: downloadUrl.subscribeDataIds as string[]});
                    }
                }
                updatedCount++;

                // switch (torrent.status) {
                //     case 'completed':
                //     case 'seeding':
                //         newStatus = 'downloaded';
                //         completedCount++;
                //         break;
                //     case 'paused':
                //     case 'error':
                //     case 'checking':
                //     default:
                //         // 其他所有状态都视为 downloading
                //         newStatus = 'downloading';
                // }

                // if (newStatus !== downloadUrl.status) {
                //     await db.documentDownloadURL.update({
                //         where: { id: downloadUrl.id },
                //         data: { status: newStatus as any }
                //     });
                //     logger.info(`更新状态: ${downloadUrl.url} ${downloadUrl.status} -> ${newStatus}`);
                //     updatedCount++;
                // }
            }

            //  movie 订阅表 同步更新 SubscribeData 表的状态
            // if (downloadUrl.subscribeDataIds) {
            //     try {
            //         const subscribeDataIds = downloadUrl.subscribeDataIds as string[];
            //         if (Array.isArray(subscribeDataIds) && subscribeDataIds.length > 0) {
            //             logger.info(torrent.status);

            //             // 获取当前 DocumentDownloadURL 的状态
            //             let currentStatus = 'undownload';
            //             if (torrent && torrent.progress >= 100) {
            //                 currentStatus = 'downloaded';
            //             } else if (torrent && ['donwloading', 'stalled'].includes(torrent.status)) {
            //                 currentStatus = 'downloading';
            //             }
            //             // 更新对应的 SubscribeData 记录
            //             await db.subscribeData.updateMany({
            //                 where: {
            //                     id: { in: subscribeDataIds }
            //                 },
            //                 data: {
            //                     status: currentStatus as any
            //                 }
            //             });

            //             logger.info(`同步更新了 ${subscribeDataIds.length} 个 SubscribeData 记录的状态为: ${currentStatus}`);
            //         }
            //     } catch (error) {
            //         logger.error(`同步更新 SubscribeData 状态失败: ${error}`);
            //     }
            // }
        }



        // 发送通知
        // const pushService = await getPushService();
        // if (pushService && (updatedCount > 0 || completedCount > 0 || undownloadedCount > 0)) {
        //     const notificationMessage = [
        //         `同步完成！`,
        //         `• 更新了 ${updatedCount} 个记录`,
        //         `• 完成了 ${completedCount} 个下载`,
        //         `• 标记了 ${undownloadedCount} 个被删除的任务`
        //     ].join('\n');

        //     await pushService.sendTaskNotification(
        //         taskName,
        //         'success',
        //         notificationMessage
        //     );
        // }

        logger.info(`${taskName} 执行完成，更新了 ${updatedCount} 个记录，完成了 ${completedCount} 个下载，标记了 ${undownloadedCount} 个被删除的任务`);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        logger.error(`${taskName} 执行失败: ${errorMessage}`);

        // 发送失败通知
        const pushService = await getPushService();
        if (pushService) {
            await pushService.sendTaskNotification(taskName, 'failed', `错误详情: ${errorMessage}`);
        }
    }
}