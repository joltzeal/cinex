import { VideoInfo } from '@/types/javdb';
import * as cheerio from 'cheerio';
/**
 * 解析包含视频卡片列表的HTML内容
 * @param htmlContent - 要解析的HTML字符串
 * @returns 提取出的 VideoInfo 对象数组
 */
export function parseAvfanVideoList(htmlContent: string): VideoInfo[] {
  if (!htmlContent) {
    return [];
  }

  try {
    const $ = cheerio.load(htmlContent);
    const results: VideoInfo[] = [];

    // 选择每个视频卡片的根元素，这里的选择器基于您提供的HTML结构
    // 您可能需要根据实际情况调整这个选择器
    $('.flex.flex-col.relative.hover\\:bg-zinc-100').each((index, element) => {
      const item = $(element);

      // --- 提取 Code ---
      const code = item.find('strong.history-link').text().trim() || null;

      // --- 提取 Title ---
      const title =
        item.find('span.line-clamp-1.text-ellipsis').text().trim() || null;

      // --- 提取 Cover ---
      const cover = item.find('img').attr('src');

      // --- 提取 Link ---
      // 两个a标签的href是相同的，取第一个即可
      const linkPath = item.find('a').attr('href');
      const link = linkPath ? `https://www.avfan.com${linkPath}` : null;

      // --- 提取 Date ---
      // 日期的div类名比较通用，我们通过它的内容格式 (YYYY-MM-DD) 来精确定位
      const date =
        item
          .find('a.block.px-1.pb-2 > div.text-sm')
          .filter((i, el) => /^\s*\d{4}-\d{2}-\d{2}\s*$/.test($(el).text()))
          .text()
          .trim() || null;

      // --- 提取 Score ---
      const scoreText = item.find('span.text-sm.text-zinc-500').text().trim();
      let score: number | null = null;
      if (scoreText) {
        const scoreMatch = scoreText.match(/(\d+\.?\d*)/); // 正则匹配数字部分
        if (scoreMatch && scoreMatch[1]) {
          score = parseFloat(scoreMatch[1]);
        }
      }

      // --- Reviews 在提供的HTML中不存在 ---
      const reviews = null;

      // 确保提取到了关键信息再添加
      if (code || title) {
        results.push({
          code,
          title,
          cover,
          date,
          score,
          reviews,
          link
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
