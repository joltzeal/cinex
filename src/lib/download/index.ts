// 处理下载任务
import { prisma } from "@/lib/prisma";
import { ensureMagnetLink, extractHash, isMagnetLink } from "@/lib/magnet/magnet-helper";
import { MovieDetail } from "@/types/javbus";
import { PreviewResponse, WhatslinkPreview } from "../magnet/link-preview";
import { getActiveClient } from "@/features/download/downloader/manager";
import path from "path";
import { DownloadMainProps, DownloadUrlData, TorrentAddOptions } from "@/types/download";
// import { sseManager } from "../sse-manager";
import { getBatchClassificationInfo } from "@/lib/ai-provider";
import { logger } from "../logger";
import { getMagnetDownloadDirectoryConfig, getMovieDownloadDirectoryConfig } from "@/services/settings";
import { MovieStatus } from "@prisma/client";
import { updateMoviesDataByNumber, updateMoviesStatusByNumber } from "@/services/subscribe";
import { findMediaItemByIdOrTitle, refreshMediaLibraryCache } from "../tasks/media-library";


/**
 * 处理磁力链接预览
 */
const processMagnetLinks = async (urls: string[]): Promise<{ url: string; preview: PreviewResponse }[]> => {
  const magnetLinksOrHashes = urls.filter(isMagnetLink);
  if (magnetLinksOrHashes.length === 0) {
    return [];
  }

  const previewer = new WhatslinkPreview();
  const successfulPreviews: { url: string; preview: PreviewResponse }[] = [];
  // 请求失败时，获取磁力预览的解决
  for (const linkOrHash of magnetLinksOrHashes) {
    const fullMagnetLink = ensureMagnetLink(linkOrHash);
    const preview = await previewer.getPreview(fullMagnetLink);
    successfulPreviews.push({ url: fullMagnetLink, preview });
  }

  return successfulPreviews;
}
const getDownloadURLExistInDB = async (urls: string[]) => {
  const urlsToCheck = urls.map(url => ensureMagnetLink(url));
  const existingUrls = await prisma.documentDownloadURL.findMany({
    where: {
      url: {
        in: urlsToCheck,
      },
    },
    select: {
      url: true, // 我们只需要知道哪个 URL 存在
    },
  });
  return existingUrls;
}
const getExistSubscribeDataMovieIds = async (movie: MovieDetail) => {
  const movieIds = await prisma.movie.findMany({
    where: {
      number: movie.id,  // movie.id 是番号
    },
  });
  return movieIds;
}
const isValidDownloadURL = async (urls: string[]) => {
  if (urls.filter((url: string) => url && url.trim() !== '').length === 0) {
    return false;
  }
  return true;
}

const getMagnetsPreviews = async (urls: string[]): Promise<{ url: string; detail: PreviewResponse | null }[]> => {
  let urlsPreviews: { url: string; detail: PreviewResponse | null }[] = [];
  const successfulPreviews = await processMagnetLinks(urls);  // 成功获取磁力预览的链接
  for (const item of successfulPreviews) {
    urlsPreviews.push({ url: item.url, detail: item.preview });
  }
  const processedUrls = new Set(successfulPreviews.map(item => item.url));
  for (const url of urls) {
    if (!processedUrls.has(url)) {
      urlsPreviews.push({ url, detail: null });
    }
  }
  return urlsPreviews;
}
export function getAllScreenshots(previews: { url: string; detail: PreviewResponse | null }[]): string[] {
  // 使用 flatMap 并过滤 null/undefined
  return previews.flatMap(pr =>
    (pr.detail?.screenshots ?? []).map(s => s.screenshot).filter(Boolean)
  );
}
export const getUrlsTitleImagesInfo = async (urlsPreviews: { url: string; detail: PreviewResponse | null }[]) => {
  let title: string = '';
  let images: string[] = [];
  if (urlsPreviews.length > 1) {
    title = urlsPreviews[0].detail?.name + ' (' + urlsPreviews.length + ')';
    images = getAllScreenshots(urlsPreviews);
  } else {
    title = urlsPreviews[0].detail?.name || '未知标题';
    images = getAllScreenshots(urlsPreviews);
  }
  return { title, images };
}
export const downloadMain = async (props: DownloadMainProps) => {
  const { urls, title, description, images, movie } = props;

  // 验证urls参数
  if (urls.length === 0) throw new Error('urls is required');
  if (!isValidDownloadURL(urls)) throw new Error('urls is invalid');

  // 验证链接是否已存在
  const existingUrls = await getDownloadURLExistInDB(urls);
  if (existingUrls.length > 0) {
    const duplicateUrls = existingUrls.map((item: any) => item.url);
    throw new TypeError(`以下链接已添加过，请勿重复提交：${duplicateUrls.join('\n')}`);
  }
  const movieIds = movie ? await getExistSubscribeDataMovieIds(movie as MovieDetail) : [];

  // 无论如何都通过api获取urls磁力详情
  const urlsPreviews = await getMagnetsPreviews(urls);
  if (urlsPreviews.length === 0 || urlsPreviews.length !== urls.length) {
    throw new Error('无法获取任何磁力链接的预览信息。');
  }

  // 多个下载连接，名称使用第一个下载连接的名称 + length ，图片为总的图片
  const { title: extractedTitle, images: extractedImages } = await getUrlsTitleImagesInfo(urlsPreviews);

  // 数组数量为1时也是如此
  const downloadURLS = urlsPreviews.map(item => ({
    url: item.url,
    status: MovieStatus.undownload,
    detail: item.detail,
    hash: extractHash(item.url),
    type: movie ? 'movie' : isMagnetLink(item.url) ? 'magnet' : null,
    subscribeDataIds: movieIds.map((item: any) => item.id),
    number: movie ? movie.id : null,
  }));

  let documentCreate = {
    title: title || extractedTitle,
    description: description || null,
    images: extractedImages,
  }

  const newDocument = await prisma.document.create({
    data: {
      ...documentCreate,
      downloadURLs: {
        create: downloadURLS as any[],
      },
    },
    include: { downloadURLs: true },
  });

  return newDocument;
}
export const downloadImmediatelyTask = async (taskId: string, document: any, movieData: any = null) => {
  try {
    logger.info(`[Task ${taskId}] 开始执行下载任务`);

    // 获取下载器客户端
    const client = await getActiveClient();
    if (!client) {
      throw new Error("没有获取到下载器客户端");
    }
    // 获取目录配置
    let directoryConfig: DirectoryConfigData | null = null;
    if (movieData && movieData.type === 'jav') {
      directoryConfig = await getMovieDownloadDirectoryConfig();
    } else {
      directoryConfig = await getMagnetDownloadDirectoryConfig();
    }
    if (!directoryConfig) {
      logger.error(`[Task ${taskId}] 没有获取到下载目录配置`);
      throw new Error("没有获取到下载目录配置");
    }
    // sseManager.emit(taskId, { stage: 'DOWNLOAD_SUBMIT', message: '正在将任务提交到下载器...' });
    logger.info('正在将任务提交到下载器...');


    for (const downloadUrl of document.downloadURLs) {
      let torrentOptions: TorrentAddOptions = {};
      // 构建下载器目录
      const fullDirPath = path.join('/downloads', directoryConfig.downloadDir);
      if (movieData && movieData.type === 'jav') {
        // 查询是否重复下载
        await refreshMediaLibraryCache();
        const existingInMediaLibrary = findMediaItemByIdOrTitle(movieData.id);
        if (existingInMediaLibrary) {
          logger.warn(`[Task ${taskId}] 已存在媒体库中，跳过下载: ${movieData.id}`);
          continue;
        }
        torrentOptions.category = 'JAV';
        torrentOptions.savepath = fullDirPath;
      } else {
        // const originalName = document.title;
        // const parseConfig = await getMovieParseConfig();
        // if (!parseConfig) {
        //   throw new Error("没有获取到解析配置");
        // }
        if (document.title ) {
          // 有详细信息，尝试 AI 分类
          try {

            logger.info(`[Task ${taskId}] 开始 AI 分类`);
            // sseManager.emit(taskId, { stage: 'AI_START', message: `开始为任务获取 AI 分类...` });

            const classificationResults = await getBatchClassificationInfo([document.title]);
            logger.info(`AI 分类完成`);
            // sseManager.emit(taskId, { stage: 'AI_COMPLETE', message: 'AI 分类获取成功！', data: classificationResults });

            const classification = classificationResults[0];
            if (classification && classification.sourceCategory) {
              // AI 分类成功，构建路径：adult/分类/人名
              const pathParts = [classification.sourceCategory];
              if (classification.personName) {
                pathParts.push(classification.personName);
              }
              const aiPath = path.join(fullDirPath, ...pathParts);
              torrentOptions.savepath = aiPath;
              logger.info(aiPath);
              logger.info(`[Task ${taskId}] AI 分类路径: ${aiPath}`);
            } else {
              // AI 分类没有生成有效路径，使用 adult 目录
              torrentOptions.savepath = fullDirPath;
              logger.info(`[Task ${taskId}] AI 分类无有效路径，使用 adult 目录: ${fullDirPath}`);
            }
          } catch (error) {
            logger.error(`[Task ${taskId}] AI 分类失败:${error}`,);
            // AI 分类失败，使用 adult 目录
            torrentOptions.savepath = fullDirPath;
            logger.info(`[Task ${taskId}] AI 分类异常，使用 adult 目录: ${fullDirPath}`);
          }
        } else {
          // 没有详细信息，使用 adult 目录和默认名称
          torrentOptions.savepath = fullDirPath;
          logger.info(`[Task ${taskId}] 无详细信息，使用 adult 目录: ${fullDirPath}`);
        }
      }
      const fullUrl = ensureMagnetLink(downloadUrl.url);
      const addTorrentResult = await client.addTorrent(fullUrl, torrentOptions);

      // 修改数据库中下载状态
      if (addTorrentResult.success) {
        await prisma.documentDownloadURL.update({
          where: { id: downloadUrl.id },
          data: { status: MovieStatus.downloading, downloadAt: new Date() }
        });
        if (movieData && movieData.type === 'jav') {
          await updateMoviesDataByNumber({ number: movieData.id, data: { downloadAt: new Date(),status: MovieStatus.downloading } });
        }
      }
      // sseManager.emit(taskId, {
      //   stage: 'PROGRESS',
      //   message: `成功提交任务: ${fullUrl}`,
      //   data: { total: document.downloadURLs.length }
      // });
      logger.info('成功提交任务: ' + fullUrl);

    }
    // sseManager.emit(taskId, { stage: 'DONE', message: '任务提交完成。成功: ' + document.downloadURLs.length + '，失败: 0。' });
    logger.info('任务提交完成。成功: ' + document.downloadURLs.length + '，失败: 0。');

    // 任务完成后，等待一下再关闭连接，确保消息发送完成
    // setTimeout(() => {
    //   sseManager.removeClient(taskId);
    //   logger.info(`[Task ${taskId}] 任务完成，关闭 SSE 连接`);
    // }, 1000);

    // 处理jav类型
    // 处理其他类型
  } catch (error: any) {
    // sseManager.emit(taskId, { stage: 'ERROR', message: `处理失败: ${error.message}` });
    // // 出错时也关闭连接
    // setTimeout(() => {
    //   sseManager.removeClient(taskId);
    //   logger.info(`[Task ${taskId}] 任务出错，关闭 SSE 连接`);
    // }, 1000);
  } finally {
    logger.info(`[Task ${taskId}] 下载任务完成`);
  }
}