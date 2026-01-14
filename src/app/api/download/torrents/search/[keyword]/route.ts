import { NextResponse } from 'next/server';
import { ClgClgScraper } from '@/lib/scrapers/clgclg';
import { ScraperClass } from '@/lib/scrapers/interface';
import { LaoWangScraper } from '@/lib/scrapers/laowang';
import { AnyBtScraper } from '@/lib/scrapers/anybt';
import { BtDiggScraper } from '@/lib/scrapers/btdig';

// ===================================================================
// 爬虫注册表
// 将来有新的爬虫类，只需要在这里添加即可
// ===================================================================
const SCRAPER_CLASSES: ScraperClass[] = [
  ClgClgScraper,
  LaoWangScraper, // 在这里注册
  AnyBtScraper,
  BtDiggScraper
  // FutureScraper, // 示例：将来添加新的爬虫
];
// ===================================================================

const SORT_MAP: { [key: number]: string } = {
  0: 'default', 1: 'size', 2: 'createdAt', 3: 'heat', 4: 'lastVisit'
};
/**
 * 处理 GET 请求
 * URL 格式: /api/download/torrents/search/{keyword}-{type}-{sort}-{page}
 * 示例: /api/download/torrents/search/interstellar-0-0-1
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ keyword: string }> }
) {
  try {
    // 1. 从 URL 路径中获取关键词
    // decodeURIComponent 用于处理中文等特殊字符
    const { keyword } = await params;
    
    if (!keyword) {
      return NextResponse.json({ error: 'Keyword cannot be empty.' }, { status: 400 });
    }

    const searchKeyword = decodeURIComponent(keyword);

    // 2. 从查询参数中获取 sort 和 type
    const { searchParams } = new URL(request.url);
    const sortParam = searchParams.get('sort') || '0';
    const typeParam = searchParams.get('type') || '0'; // 预留，当前未使用

    const sort = parseInt(sortParam, 10);
    if (isNaN(sort) || sort < 0 || sort > 4) {
      return NextResponse.json({ error: 'Invalid sort parameter. Must be between 0 and 4.' }, { status: 400 });
    }

    console.log(`API received search: keyword='${searchKeyword}', sort=${sort}, type=${typeParam}`);

    // 3. 并行执行所有已注册的爬虫
    const promises = SCRAPER_CLASSES.map(async (Scraper) => {
      console.log(`-> Starting scraper: ${Scraper.sourceName}`);
      const instance = new Scraper();
      const list = await instance.search(searchKeyword, sort);
      console.log(`<- Finished scraper: ${Scraper.sourceName}, found ${list.length} items.`);
      return {
        source: Scraper.sourceName,
        count: list.length,
        list,
      };
    });

    const results = await Promise.allSettled(promises);

    // 4. 将结果聚合成最终的数据结构，只包含成功的爬虫
    const data: { [key: string]: { count: number; list: any[] } } = {};
    for (const result of results) {
      if (result.status === 'fulfilled') {
        data[result.value.source] = {
          count: result.value.count,
          list: result.value.list,
        };
      } else {
        const error = result.reason;
        const statusCode = error?.response?.statusCode || error?.statusCode || 'N/A';
        console.error(`Scraper failed with status ${statusCode}:`, error?.message || error);
      }
    }

    // 5. 返回规范化的 JSON 响应
    return NextResponse.json({
      query: {
        searchKeyword,
        sort: SORT_MAP[sort] || 'unknown',
        type: parseInt(typeParam, 10),
      },
      data,
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}