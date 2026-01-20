import { getActiveClient } from '@/features/download/downloader/manager';
import { extractHash } from '@/lib/magnet/magnet-helper';
import { getPushService } from './utils';
import { prisma } from '@/lib/prisma';
import { manualTransfer } from '@/lib/transfer';
import { getFileInfo } from '@/lib/parse/get-file-info';
import { getMovieDownloadDirectoryConfig, getSetting, SettingKey } from '@/services/settings';
import { findVideoFiles } from '@/lib/parse/file';
import path from 'path';
import { logger } from '@/lib/logger';
import { DocumentDownloadStatus, DocumentDownloadURL, MovieStatus, TransferMethod, TransferStatus } from '@prisma/client';
import { updateMoviesStatusByNumber } from '@/services/subscribe';

export async function taskDownloadStatusSync() {
    const taskName = '下载状态同步';

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

        // 创建哈希到种子状态的映射
        const torrentStatusMap = new Map<string, any>();
        for (const torrent of torrents) {
            if (torrent.hash) {
                torrentStatusMap.set(torrent.hash.toLowerCase(), torrent);
            }
        }
        const downloadDirectoryConfig = await getMovieDownloadDirectoryConfig();
        // 获取数据库中所有需要检查的记录（包括下载中、暂停、检查中等状态）
        const allDownloadUrls: DocumentDownloadURL[] = await prisma.documentDownloadURL.findMany({
            where: {
                status: {
                    in: ['downloading', 'paused', 'checking', 'error']
                }
            },
            include: { document: true }
        });


        logger.info(`数据库中有 ${allDownloadUrls.length} 个需要检查的下载记录`);

        let updatedCount = 0;
        let completedCount = 0;
        let undownloadedCount = 0;

        const parseConfig = await getSetting(SettingKey.MovieParseConfig);

        // 遍历数据库中的记录，更新状态
        for (const downloadUrl of allDownloadUrls) {
            let movie = null
            const hash = downloadUrl.hash || extractHash(downloadUrl.url);
            if (!hash) {
                logger.warn(`无法从URL提取哈希: ${downloadUrl.url}`);
                continue;
            }

            const torrent = torrentStatusMap.get(hash.toLowerCase());
            const urlRecord = await prisma.documentDownloadURL.findFirst({
                where: {
                    hash: downloadUrl.hash,
                },
                include: {
                    document: {
                        include: {
                            movie: true // 级联查询出关联的 Movie
                        }
                    }
                }
            });

            if (urlRecord?.document?.movie) {
                movie = urlRecord.document.movie;
                // console.log("找到了电影:", movie.title);
                // console.log("匹配的链接是:", urlRecord.url);
            }
            if (!torrent) {
                logger.info(`种子不在下载器中，标记为未下载: ${hash}`);
                await prisma.documentDownloadURL.update({
                    where: { id: downloadUrl.id },
                    data: { status: MovieStatus.undownload }
                });
                // if (downloadUrl.type === 'movie' && downloadUrl.number) {
                //     await updateMoviesStatusByNumber({ number: downloadUrl.number, status: MovieStatus.undownload });
                // }
                if (movie){await updateMoviesStatusByNumber({ number: movie.number, status: MovieStatus.undownload });}
                undownloadedCount++;
                updatedCount++;
            } else {
                // 下载器状态[paused, downloading, checking, error, completed, stalled]
                // download status [undownload, downloading, downloaded, paused, checking, error]
                // subscribe data 下载状态[uncheck, checked, undownload, downloading, downloaded, added, subscribed] 但是不应修改，只有undownload, downloading, downloaded 三个状态可以修改
                let torrentStatus = torrent.status;
                let torrentProgress = torrent.progress;
                let documentDownloadStatus: DocumentDownloadStatus | null = null;  // 可能包含除movie 外的其他下载任务
                let subscribeDataStatus: MovieStatus | null = null; // movie 下载任务


                // 更新 documentDownloadStatus
                if (torrentProgress >= 100) {
                    documentDownloadStatus = DocumentDownloadStatus.downloaded;
                    subscribeDataStatus = MovieStatus.downloaded;
                    completedCount++;
                } else if (torrentStatus === 'downloading') {
                    documentDownloadStatus = DocumentDownloadStatus.downloading;
                    subscribeDataStatus = MovieStatus.downloading;
                } else if (torrentStatus === 'stalled') {
                    documentDownloadStatus = DocumentDownloadStatus.downloading;
                    subscribeDataStatus = MovieStatus.downloading;
                } else if (torrentStatus === 'paused' && torrentProgress < 100) {
                    documentDownloadStatus = DocumentDownloadStatus.paused;
                } else if (torrentStatus === 'checking') {
                    documentDownloadStatus = DocumentDownloadStatus.checking;
                } else if (torrentStatus === 'error') {
                    documentDownloadStatus = DocumentDownloadStatus.error;
                }

                // 更新下载任务文档中的状态
                if (documentDownloadStatus) {
                    await prisma.documentDownloadURL.update({
                        where: { id: downloadUrl.id },
                        data: { status: documentDownloadStatus }
                    });
                }
                logger.info(downloadUrl.number)

                // 更新订阅中的影片状态
                // if (subscribeDataStatus && downloadUrl.type === 'movie' && downloadUrl.number) {
                //     await updateMoviesStatusByNumber({ number: downloadUrl.number, status: subscribeDataStatus });
                // }
                if (movie && subscribeDataStatus){await updateMoviesStatusByNumber({ number: movie.number, status: subscribeDataStatus });}



                if (documentDownloadStatus === DocumentDownloadStatus.downloaded && movie) {
                    const sourcePath = torrent.contentPath || torrent.rootPath;
                    const relativePath = path.normalize(sourcePath.replace(/^\/downloads/, ''));
                    const finalSavePath = path.join(process.cwd(), 'media', relativePath);
                    const videoFiles = await findVideoFiles(finalSavePath, parseConfig!.cleanupExtensions, parseConfig!.cleanupFilenameContains);
                    for (const videoFile of videoFiles) {
                        const fileInfo = await getFileInfo(videoFile);
                        const fileTransfer = await prisma.fileTransferLog.create({
                            data: {
                                title: fileInfo.fileName,
                                number: null,
                                sourcePath: videoFile,
                                destinationPath: '',
                                status: TransferStatus.PROCESSING,
                                transferMethod: downloadDirectoryConfig!.organizeMethod.toUpperCase() as TransferMethod,
                            },
                        });
                        await manualTransfer({ file: { id: videoFile, name: fileInfo.fileName }, number: fileInfo.number, transferMethod: downloadDirectoryConfig!.organizeMethod.toUpperCase() as TransferMethod, fileTransferLogId: fileTransfer.id});
                    }
                }
                updatedCount++;
            }
        }

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