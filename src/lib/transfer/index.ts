import { prisma } from "@/lib/prisma";
import { getMovieDownloadDirectoryConfig, getSetting, SettingKey } from "@/services/settings";
import { MovieStatus, TransferStatus } from "@prisma/client";
import { promises as fs } from 'fs';
import { Jimp } from 'jimp';
import path from "path";
import { translatePlotByAI } from "../ai-provider";
import { logger } from "../logger";
import metatubeClient from "@/lib/metatube";
import NfoGenerator, { mapMovieDetailToNFO } from "../nfo-generator";
import { generatePathFromRule } from "../parse/file-number-parser";
import { getFileInfo } from "../parse/get-file-info";
import { proxyRequest } from "../proxyFetch";
import { BASE_PARSE_CONFIG } from "@/constants/data";
async function downloadImage(url: string, outputDir: string) {
  const urlObj = new URL(url); // 解析 URL
  const refererOrigin = urlObj.origin; // 获取 origin，例如 "https://www.example.com"

  const fetchOptions: RequestInit = {
    headers: {
      // 添加 Referer 头
      'Referer': refererOrigin,
      // 某些网站可能还需要 User-Agent 头，可以考虑添加
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      'Cookie': '4fJN_2132_st_p=0%7C1751112872%7C998b571f8f3b16f1df7c2ec86fd23cf1; 4fJN_2132_viewid=tid_142771; 4fJN_2132_seccodecShc7yEr=17725.25b92167b81413dbfe; PHPSESSID=nrgcgque5qpulmp3g8oc47hto6; existmag=mag',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Priority': 'u=1, i'
    },
    // headers: {
    //   'accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    //   'accept-language': 'zh-CN,zh;q=0.9',
    //   'cache-control': 'no-cache',
    //   'dnt': '1',
    //   'pragma': 'no-cache',
    //   'priority': 'u=2, i',
    //   'referer': 'https://www.javbus.com/ja/SONE-880',
    //   'sec-ch-ua': '"Not=A?Brand";v="24", "Chromium";v="140"',
    //   'sec-ch-ua-mobile': '?0',
    //   'sec-ch-ua-platform': '"macOS"',
    //   'sec-fetch-dest': 'image',
    //   'sec-fetch-mode': 'no-cors',
    //   'sec-fetch-site': 'same-origin',
    //   'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    //   'cookie': '4fJN_2132_st_p=0%7C1751112872%7C998b571f8f3b16f1df7c2ec86fd23cf1; 4fJN_2132_viewid=tid_142771; 4fJN_2132_seccodecShc7yEr=17725.25b92167b81413dbfe; PHPSESSID=nrgcgque5qpulmp3g8oc47hto6; existmag=mag'
    // }
  };

  const res = await proxyRequest(url, {
    ...fetchOptions,
    responseType: 'buffer',
  }); // 将选项传递给 proxyRequest
  if (res.statusCode !== 200) {
    throw new Error(`下载失败: ${url} (状态码: ${res.statusCode})`);
  }

  // 使用 got 的 rawBody 属性获取 Buffer
  const buffer = res.rawBody;

  // 获取文件名
  // 最佳实践是从 Content-Disposition 头中获取文件名，如果存在的话
  // const contentDisposition = res.headers.get('content-disposition');
  // let fileName = '';
  // if (contentDisposition && /filename\*?=['"]?(.*)['"]?/.test(contentDisposition)) {
  //   fileName = decodeURIComponent(/filename\*?=['"]?(.*)['"]?/.exec(contentDisposition)[1]);
  // } else {
  //   // 如果没有 Content-Disposition 头，则从 URL 路径中获取
  //   fileName = path.basename(urlObj.pathname);
  // }
  // 保持与原代码一致，从 URL 路径中获取文件名
  const fileName = path.basename(urlObj.pathname);
  const filePath = path.join(outputDir, fileName);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(filePath, buffer);
}
async function fileExists(path: string) {
  try {
    await fs.access(path);
    return true;
  } catch (err) {
    return false;
  }
}
async function downloadFanarts(urls: string[], outputDir: string) {
  for (const url of urls) {
    try {
      await downloadImage(url, outputDir);
    } catch (err) {
      logger.error(`下载失败: ${url}:${err}`,);
    }
  }
}

interface DownloadMoviePictureParams {
  filePath: string;
  fileName: string;
  rule: any;
  movieDetail: any;
  fileAttr: any;
}
async function downloadMoviePicture(params: DownloadMoviePictureParams) {
  // await downloadImage(url, outputDir);
  // thumb_url: 'https://awsimgsrc.dmm.co.jp/pics_dig/digital/video/ssni00939/ssni00939ps.jpg',
  // big_thumb_url: 'https://awsimgsrc.dmm.co.jp/pics_dig/digital/video/ssni00939/ssni00939ps.jpg',
  // cover_url: 'https://awsimgsrc.dmm.co.jp/pics_dig/digital/video/ssni00939/ssni00939pl.jpg',
  // big_cover_url: '',
  // preview_video_url: 'https://cc3001.dmm.co.jp/litevideo/freepv/s/ssn/ssni00939/ssni009394ks.mp4',
  const { filePath, fileName, rule, movieDetail } = params;
  // poster 竖图， fanart thumb 横图，poster thumb 需要添加水印 fanart。
  const posterUrl = movieDetail.big_thumb_url || movieDetail.thumb_url;
  const fanartUrl = movieDetail.big_cover_url || movieDetail.cover_url;
  const thumbUrl = movieDetail.big_cover_url || movieDetail.cover_url;
  // 下载 poster // 解析 URL
  const headers = {
    'accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'accept-language': 'zh-CN,zh;q=0.9',
    'cache-control': 'no-cache',
    'dnt': '1',
    'pragma': 'no-cache',
    'priority': 'u=2, i',
    'referer': 'https://www.javbus.com/ja/SONE-880',
    'sec-ch-ua': '"Not=A?Brand";v="24", "Chromium";v="140"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'image',
    'sec-fetch-mode': 'no-cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  }
  // 确保目录存在
  await fs.mkdir(filePath, { recursive: true });

  const posterRes = await proxyRequest(posterUrl, {
    headers: headers,
    responseType: 'buffer',
  });
  if (posterRes.statusCode !== 200) throw new Error(`下载失败: ${posterUrl} (状态码: ${posterRes.statusCode})`);
  const posterBuffer = posterRes.rawBody;
  const posterFilePath = path.join(filePath, `${fileName}-poster.jpg`);
  await fs.writeFile(posterFilePath, posterBuffer);

  // 下载 fanart 和 thumb
  const thumbRes = await proxyRequest(thumbUrl, {
    headers: headers,
    responseType: 'buffer',
  });
  if (thumbRes.statusCode !== 200) throw new Error(`下载失败: ${thumbUrl} (状态码: ${thumbRes.statusCode})`);
  const thumbBuffer = thumbRes.rawBody;
  const thumbFilePath = path.join(filePath, `${fileName}-thumb.jpg`);
  const fanartFilePath = path.join(filePath, `${fileName}-fanart.jpg`);
  await fs.writeFile(thumbFilePath, thumbBuffer);
  await fs.writeFile(fanartFilePath, thumbBuffer);

  // 添加水印
  const watermarkKeys = ['leak', 'cWord', 'destroyed', 'wuma', 'youma'];
  const activeWatermarks = watermarkKeys.filter(key => params.fileAttr[key]);

  if (activeWatermarks.length > 0) {
    logger.info(`Applying watermarks: ${activeWatermarks.join(', ')}`);
    // Apply watermarks to the poster and the thumb image
    await addWatermarks(posterFilePath, activeWatermarks);
    await addWatermarks(thumbFilePath, activeWatermarks);
  }
}
/**
 * Adds multiple watermarks to an image's corners using Jimp.
 * @param imagePath The path to the image to be watermarked.
 * @param watermarkKeys An array of watermark names (e.g., ['leak', 'cWord']).
 */
export async function addWatermarks(imagePath: string, watermarkKeys: string[]) {
  try {
    const mainImage = await Jimp.read(imagePath);
    const mainImageWidth = mainImage.width;
    const mainImageHeight = mainImage.height;
    const margin = 10; // 10px margin from the edges

    // Loop through each watermark that needs to be applied
    for (let i = 0; i < watermarkKeys.length; i++) {
      const key = watermarkKeys[i];
      const watermarkPath = path.join(process.cwd(), 'public', 'assets', 'parse', `${key}.png`);

      try {
        const watermark = await Jimp.read(watermarkPath);


        // --- Correctly resize the watermark ---
        // Calculate the new height based on the rule (5/40 of the main image's height)
        const newWatermarkHeight = mainImageHeight * (5 / 40);
        // Resize the watermark, using Jimp.AUTO (-1) for the width to maintain aspect ratio
        watermark.resize({ h: newWatermarkHeight });

        const watermarkWidth = watermark.width;
        const watermarkHeight = watermark.height;

        // --- Manually calculate coordinates for each corner ---
        let x = margin;
        let y = margin;

        const cornerIndex = i % 4; // 0: TL, 1: TR, 2: BR, 3: BL

        if (cornerIndex === 1) { // Top-Right
          x = mainImageWidth - watermarkWidth - margin;
        } else if (cornerIndex === 2) { // Bottom-Right
          x = mainImageWidth - watermarkWidth - margin;
          y = mainImageHeight - watermarkHeight - margin;
        } else if (cornerIndex === 3) { // Bottom-Left
          y = mainImageHeight - watermarkHeight - margin;
        }
        mainImage.composite(watermark, x, y);

      } catch (watermarkError) {
        logger.error(`Error processing watermark "${key}" from ${watermarkPath}:${watermarkError}`,);
      }
    }

    // Overwrite the original file with the watermarked version
    await mainImage.write(imagePath as `${string}.${string}`);
    logger.info(`Watermarks successfully applied to ${imagePath}`);

  } catch (mainImageError) {
    logger.error(`Failed to read main image at ${imagePath}:${mainImageError}`,);
  }
}


interface ManualTransferParams {
  file: { id: string; name: string };
  number: string;
  transferMethod: string;
  fileTransferLogId: string;
  subscribeDataIds?: string[];
}

/**
 * 手动转移文件
 * @param file - 文件对象，包含 id 和 name
 * @param number - 番号
 * @param transferMethod - 转移方法
 * @returns 无返回值
 * @example
 */
export async function manualTransfer(
  params: ManualTransferParams
) {
  let createdDirectories: string[] = [];
  let createdFiles: string[] = [];
  let originalFilePath: string | null = null;
  let tempFilePath: string | null = null;
  try {

    // 1. 获取文件信息 - 根据文件名解析文件信息
    const fileInfo = await getFileInfo(params.file.id);
    if (!fileInfo.number || !fileInfo.letters) {
      throw new Error('无法解析文件信息');
    }
    // 2. 根据番号获取元数据
    const filePath = params.file.id;
    originalFilePath = filePath;
    // 3. 判断文件是否存在
    if (!await fileExists(filePath)) {
      throw new Error('源文件不存在');
    }
    // 4. 获取刮削规则
    const parseConfig = await getSetting(SettingKey.MovieParseConfig) || BASE_PARSE_CONFIG;

    // 5. 根据番号获取元数据 需要配置 metatube api
    const movieSearchList = await metatubeClient.searchByNumber(params.number);
    if (movieSearchList.length === 0) {
      throw new Error('未找到匹配的影片信息');
    }

    console.log(movieSearchList);


    // 6. 判断影片是否存在于数据库中
    const movieDetail = await metatubeClient.getDetails(movieSearchList[0].provider, movieSearchList[0].id);
    if (!movieDetail) {
      throw new Error('无法获取影片详情');
    }

    // 根据影片详情生成影片数据
    let movieDetailData = {
      number: movieDetail.number,
      originaltitle: movieDetail.title,
      title: movieDetail.title,
      actor: movieDetail.actors[0],
      all_actor: movieDetail.actors,
      first_actor: movieDetail.actors[0],
      letters: movieDetail.number.split('-')[0].toUpperCase(),
      first_letter: movieDetail.number.split('-')[0][0],
      director: movieDetail.director,
      studio: movieDetail.maker,
      publisher: movieDetail.label,
      originalplot: movieDetail.summary,
      plot: movieDetail.summary,
      release: new Date(movieDetail.release_date).getDate(),
      year: new Date(movieDetail.release_date).getFullYear(),
      runtime: movieDetail.runtime,
    }

    if (parseConfig.enableAiTranslation) {
      // 如果开启了ai 翻译，翻译影片名称和简介
      const batchResult = await translatePlotByAI([movieDetail.title, movieDetail.summary || movieDetail.title]);
      if (batchResult) {
        logger.info(`AI 翻译结果:${batchResult}`);

        const [title, plot] = batchResult;
        movieDetailData.plot = plot;
        movieDetailData.title = title;
      }
    }

    const movieDirectoryConfig = await getMovieDownloadDirectoryConfig() as any;

    if (!movieDirectoryConfig || !movieDirectoryConfig.mediaLibraryDir) {
      throw new Error('无法获取媒体库配置');
    }

    // 根据影片数据生成目录路径和文件名（但不实际创建）
    const rulePath = generatePathFromRule(parseConfig.directoryRule, movieDetailData);
    const savePath = path.join(process.cwd(), 'media', movieDirectoryConfig.mediaLibraryDir, rulePath);
    logger.info(`计划保存路径:${savePath}`);

    const fileExtension = path.extname(filePath);
    let newFileName = generatePathFromRule(parseConfig.fileNamingRule, movieDetailData);

    const fileAttr = {
      destroyed: false,
      cWord: false,
      leak: false,
      wuma: false,
      youma: false,
    }
    let tags = [];
    if (fileInfo.destroyed == '-U') {
      fileAttr.destroyed = true;
      tags.push('U');
    }
    if (fileInfo.cWord == '-C') {
      fileAttr.cWord = true;
      tags.push('C');
    }
    if (fileInfo.leak) {
      fileAttr.leak = true;
      tags.push('L');
    }
    const saveFileName = tags.length > 0 ? `${newFileName}-${tags.join('')}` : newFileName;
    const newFilePath = path.join(savePath, saveFileName + fileExtension);

    // 检查目标文件是否已存在
    if (await fileExists(newFilePath)) {
      throw new Error('目标文件已存在');
    }

    // === 开始文件操作阶段（事务性操作）===
    logger.info('开始文件操作...');

    // 1. 创建目标目录
    await fs.mkdir(savePath, { recursive: true });
    createdDirectories.push(savePath);

    logger.info('===========================================');
    logger.info(params.transferMethod);
    logger.info('===========================================');

    // 2. 根据转移方法处理文件
    if (params.transferMethod === 'MOVE') {
      logger.info('===========================================');
      logger.info(newFilePath);
      logger.info('===========================================');
      await fs.rename(filePath, newFilePath);
      tempFilePath = newFilePath; // 记录新位置
    } else if (params.transferMethod === 'COPY') {
      await fs.copyFile(filePath, newFilePath);
      createdFiles.push(newFilePath);
    } else if (params.transferMethod === 'HARDLINK') {
      await fs.link(filePath, newFilePath);
      createdFiles.push(newFilePath);
    } else if (params.transferMethod === 'SOFTLINK') {
      await fs.symlink(filePath, newFilePath);
      createdFiles.push(newFilePath);
    }

    // 3. 下载剧照
    if (parseConfig.downloadFanart) {
      const fanartDir = path.join(savePath, 'extrafanart');
      await fs.mkdir(fanartDir, { recursive: true });
      createdDirectories.push(fanartDir);

      const fanartUrl = movieDetail.preview_images;
      await downloadFanarts(fanartUrl, fanartDir);
    }

    // 4. 创建 NFO 文件
    const nfoTitle = generatePathFromRule(parseConfig.nfoTitleRule, movieDetailData);
    movieDetailData.title = nfoTitle;
    const nfoDetail = {
      ...movieDetail,
      plot: movieDetailData.plot,
      title: nfoTitle,
      originaltitle: movieDetailData.originaltitle,
      originalplot: movieDetailData.originalplot,
    }
    const nfoFilePath = path.join(savePath, saveFileName + '.nfo');
    const nfoData = mapMovieDetailToNFO(nfoDetail);
    const nfoGenerator = new NfoGenerator(nfoData);
    const nfoContent = nfoGenerator.generateXml();
    await fs.writeFile(nfoFilePath, nfoContent);
    createdFiles.push(nfoFilePath);

    // 5. 下载海报和缩略图
    await downloadMoviePicture({
      filePath: savePath,
      fileName: saveFileName,
      rule: parseConfig,
      movieDetail: movieDetail,
      fileAttr: fileAttr,
    });

    // 6. 更新数据库为成功状态
    const dbMovie = await prisma.movie.findUnique({
      where: {
        number: movieDetail.number,
      },
    })
    if (dbMovie) {
      await prisma.movie.update({
        where: {
          number: movieDetail.number,
        },
        data: {
          status: MovieStatus.transfered,
          addedAt: new Date(),
        }
      });
    }
    await prisma.fileTransferLog.update({
      where: { id: params.fileTransferLogId },
      data: {
        destinationPath: newFilePath,
        title: movieDetail.title,
        number: movieDetail.number,
        status: TransferStatus.SUCCESS,
        completedAt: new Date(),
      },
    });


    logger.info('文件转移完成');

  } catch (error) {
    logger.error(`文件转移过程中出现错误:${error}`,);

    // 执行回滚操作
    await rollbackFileOperations({
      createdFiles,
      createdDirectories,
      originalFilePath,
      tempFilePath,
      transferMethod: params.transferMethod
    });

    // 更新数据库为失败状态
    await prisma.fileTransferLog.update({
      where: { id: params.fileTransferLogId },
      data: {
        destinationPath: 'N/A',
        title: params.file.name,
        number: error instanceof Error ? error.message : '未知错误',
        status: TransferStatus.FAILURE,
        completedAt: new Date(),
      },
    });

    // 重新抛出错误以便上层处理
    throw error;
  }
}

// 回滚操作的辅助函数
async function rollbackFileOperations(options: {
  createdFiles: string[];
  createdDirectories: string[];
  originalFilePath: string | null;
  tempFilePath: string | null;
  transferMethod: string;
}) {
  const { createdFiles, createdDirectories, originalFilePath, tempFilePath, transferMethod } = options;

  logger.info('开始回滚文件操作...');

  try {
    // 1. 删除创建的文件
    for (const filePath of createdFiles) {
      try {
        if (await fileExists(filePath)) {
          await fs.unlink(filePath);
          logger.info(`已删除文件:${filePath}`,);
        }
      } catch (error) {
        logger.error(`删除文件失败:${filePath}:${error}`,);
      }
    }

    // 2. 如果是移动操作且文件已被移动，尝试恢复原文件
    if (transferMethod === 'move' && tempFilePath && originalFilePath) {
      try {
        if (await fileExists(tempFilePath) && !await fileExists(originalFilePath)) {
          await fs.rename(tempFilePath, originalFilePath);
          logger.info(`已恢复原文件:${originalFilePath}`,);
        }
      } catch (error) {
        logger.error(`恢复原文件失败:${error}`,);
      }
    }

    // 3. 删除创建的目录（按倒序删除，先删除子目录）
    for (const dirPath of createdDirectories.reverse()) {
      try {
        // 检查目录是否为空，只删除空目录
        const files = await fs.readdir(dirPath);
        if (files.length === 0) {
          await fs.rmdir(dirPath);
          logger.info(`已删除空目录:${dirPath}`,);
        }
      } catch (error) {
        logger.error(`删除目录失败:${dirPath}:${error}`,);
      }
    }

    logger.info('回滚操作完成');
  } catch (error) {
    logger.error(`回滚操作失败:${error}`,);
  }
}