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

    // 选择每个视频卡片的根元素
    // 新结构：<div class="flex flex-col relative group">
    $('.flex.flex-col.relative.group').each((index, element) => {
      const item = $(element);

      // --- 提取 Code ---
      // 新结构：<strong class="block line-clamp-1 text-ellipsis history-link">SONE-846</strong>
      const code = item.find('strong.history-link').text().trim() || null;

      // --- 提取 Title ---
      // 新结构：<span class="line-clamp-1 text-ellipsis"> 标题+++瀬戸環奈</span>
      // 注意：title 在 div.title 下的 span 中
      const title =
        item.find('div.title span.line-clamp-1').text().trim() || null;

      // --- 提取 Cover ---
      // 新结构：<img src="https://c1.avfan.com/covers/io/Ioa77v.jpg" loading="lazy" ...>
      const cover = item.find('img').attr('src') || '';

      // --- 提取 Link ---
      // 新结构：<a href="/zh-CN/movies/C6dqqBbd" ...>
      const linkPath = item.find('a').first().attr('href');
      const link = linkPath ? `https://www.avfan.com${linkPath}` : null;

      // --- 提取 Date ---
      // 新结构：<div class="text-sm text-zinc-600 dark:text-zinc-300">2025-09-05</div>
      // 在 a.block.px-1.pb-2 下，找到包含日期格式的 div
      const date =
        item
          .find('a.block.px-1 > div.text-sm')
          .filter((i, el) => /^\s*\d{4}-\d{2}-\d{2}\s*$/.test($(el).text()))
          .text()
          .trim() || null;

      // --- 提取 Score ---
      // 新结构：<span class="text-sm text-zinc-500 dark:text-zinc-400 mt-1 md:mt-0">4.54分</span>
      const scoreText = item.find('span.text-sm.text-zinc-500, span.text-sm.text-zinc-400').text().trim();
      let score: number | null = null;
      if (scoreText) {
        const scoreMatch = scoreText.match(/(\d+\.?\d*)/); // 正则匹配数字部分
        if (scoreMatch && scoreMatch[1]) {
          score = parseFloat(scoreMatch[1]);
        }
      }

      // --- 提取 Tags (可选) ---
      // 新结构：<span class="sub-tag orange">有字幕</span>
      const hasSubtitle = item.find('.sub-tag').text().includes('有字幕');

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
