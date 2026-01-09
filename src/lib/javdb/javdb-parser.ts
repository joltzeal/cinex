import { Magnet } from '@/types/javbus';
import { VideoInfo } from '@/types/javdb';
import * as cheerio from 'cheerio';
import { convertSizeToBytes } from '@/lib/utils/file-size';
import { proxyRequest } from '../proxyFetch';

/**
 * 根据番号查找电影
 * @param movies - 电影列表
 * @param numberToFind - 要查找的番号
 * @returns 找到的电影对象，未找到返回 null
 */
export function findMovieByNumber(
  movies: VideoInfo[],
  numberToFind: string
): VideoInfo | null {
  const foundMovie = movies.find((movie) => movie.code === numberToFind);
  return foundMovie ?? null;
}
/**
 * 从给定的 HTML 结构中解析磁力链接列表
 * @param html - 包含磁力链接列表的 HTML 字符串
 * @returns Magnet 对象的数组
 */
export function parseMagnetLinks(html: string): Magnet[] {
  const $ = cheerio.load(html);
  const magnets: Magnet[] = [];

  // 选择所有 class 包含 'item' 和 'columns' 的 div 元素
  $('.item.columns').each((_, element) => {
    const item = $(element);

    // 在 .magnet-name 中找到 a 标签
    const linkElement = item.find('.magnet-name a');

    // 1. 提取磁力链接 (link)
    const link = linkElement.attr('href') ?? '';

    // 2. 从磁力链接中提取哈希值 (id)
    // 使用正则表达式匹配 urn:btih: 后的40位哈希字符串
    const idMatch = link.match(/urn:btih:([a-zA-Z0-9]{40})/);
    const id = idMatch ? idMatch[1] : ''; // 如果没匹配到则为空字符串

    // 如果连磁力链接或ID都没有，就跳过这个条目
    if (!id) {
      return; // continue to next iteration
    }

    // 3. 提取标题 (title)
    const title = linkElement.find('.name').text().trim();

    // 4. 提取标签 (isHD, hasSubtitle)
    let isHD = false;
    let hasSubtitle = false;
    linkElement.find('.tags .tag').each((_, tagEl) => {
      const tagText = $(tagEl).text().trim();
      if (tagText === '高清') {
        isHD = true;
      } else if (tagText === '字幕') {
        hasSubtitle = true;
      }
    });

    // 5. 提取文件大小 (size, numberSize)
    const metaText = linkElement.find('.meta').text().trim(); // "5.75GB, 4個文件"
    // 只取逗号前的部分作为 size 字符串
    const sizeString = metaText.split(',')[0].trim() || null; // "5.75GB" or null
    const numberSize = convertSizeToBytes(sizeString);

    // 6. 提取分享日期 (shareDate)
    const shareDate = item.find('.date .time').text().trim() || null;

    // 7. 组合成对象并添加到数组中
    magnets.push({
      id,
      link,
      isHD,
      title,
      size: sizeString,
      numberSize,
      shareDate,
      hasSubtitle
    });
  });

  return magnets;
}

/**
 * 从 JAVDB 获取指定番号的磁力链接
 * @param number - 电影番号
 * @returns 磁力链接数组，未找到返回 null
 */
export async function getJavdbMagnetLinks(
  number: string
): Promise<Magnet[] | null> {
  const response = await proxyRequest(
    `https://javdb.com/search?q=${number.toUpperCase()}&f=all`,
    {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to fetch: ${response.statusCode} ${response.statusMessage}`
    );
  }

  const body = response.body;

  const movies = parseVideoList(body);

  const foundMovie = findMovieByNumber(movies, number);
  if (!foundMovie) {
    return null;
  }
  const movieDetail = await proxyRequest(foundMovie.link!, {
    method: 'GET',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  if (!movieDetail.ok) {
    throw new Error(
      `Failed to fetch: ${movieDetail.statusCode} ${movieDetail.statusMessage}`
    );
  }
  const movieDetailBody = movieDetail.body;
  const magnets = parseMagnetLinks(movieDetailBody);
  return magnets;
}

/**
 * 解析 JAVDB 视频列表页面
 * @param htmlContent - HTML 页面内容
 * @returns 视频信息数组
 */
export function parseVideoList(htmlContent: string): VideoInfo[] {
  if (!htmlContent) {
    return [];
  }

  try {
    const $ = cheerio.load(htmlContent);
    const results: VideoInfo[] = [];

    $('.item').each((index, element) => {
      const item = $(element);

      // --- 提取 Code 和 Title ---
      const videoTitleElement = item.find('.video-title');
      const code = videoTitleElement.find('strong').text().trim() || null;
      const fullTitleText = videoTitleElement.text().trim();
      // 只有在 code 存在时才进行替换，否则 title 就是完整文本
      const title = code
        ? fullTitleText.replace(code, '').trim()
        : fullTitleText;

      // --- 提取 Cover ---
      const cover = item.find('.cover img').attr('src');

      // --- 提取 Date ---
      const date = item.find('.meta').text().trim() || null;

      const link = item.find('.item a').attr('href') || null;

      // --- 提取 Score 和 Review Count ---
      const scoreText = item.find('.score .value').text().trim();
      let score: number | null = null;
      let reviews: number | null = null;

      if (scoreText) {
        const scoreMatch = scoreText.match(/(\d+\.?\d*)分/);
        if (scoreMatch && scoreMatch[1]) {
          score = parseFloat(scoreMatch[1]);
        }

        const reviewsMatch = scoreText.match(/由(\d+)人評價/);
        if (reviewsMatch && reviewsMatch[1]) {
          reviews = parseInt(reviewsMatch[1], 10);
        }
      }

      // 只有在提取到有效信息时才添加到结果中（例如，必须有 code 或 title）
      if (code || title) {
        results.push({
          code,
          title: title || null,
          cover,
          date,
          score,
          reviews,
          link: `https://javdb.com${link}`
        });
      }
    });

    return results;
  } catch (error) {
    console.error('Error parsing HTML with Cheerio:', error);
    // 发生解析错误时返回空数组，避免程序崩溃
    return [];
  }
}
