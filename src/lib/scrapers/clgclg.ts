import * as cheerio from 'cheerio';
import { TorrentSearchResult } from './interface';
import { proxyRequest } from '@/lib/proxyFetch';


export class ClgClgScraper {
  // 添加静态属性，用于在API结果中标识数据来源
  public static readonly sourceName = '磁力狗';

  private readonly baseUrl = 'https://clgclg.com';
  private readonly requestDelay = 500;

  // ... headers 保持不变 ...
  private readonly headers: HeadersInit = {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'zh-CN,zh;q=0.9',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
  };

  // search 方法签名已经符合接口，无需修改
  public async search(keyword: string, sort: number, maxPages: number = 5): Promise<TorrentSearchResult[]> {
    // ... search 方法的内部实现保持不变 ...
    const allResults: TorrentSearchResult[] = [];
    const encodedKeyword = encodeURIComponent(keyword);

    const firstPageUrl = `${this.baseUrl}/search-${encodedKeyword}-0-${sort}-1.html`;
    console.log(`[${ClgClgScraper.sourceName}] Fetching page 1 from: ${firstPageUrl}`);
    const firstPageHtml = await this._fetchHtml(firstPageUrl);

    if (!firstPageHtml) {
      console.error(`[${ClgClgScraper.sourceName}] Failed to fetch the first page. Aborting.`);
      return [];
    }

    const firstPageResults = this._parseHtml(firstPageHtml);
    allResults.push(...firstPageResults);

    const totalPages = this._parseTotalPages(firstPageHtml);
    const pagesToFetch = Math.min(totalPages, maxPages);
    console.log(`[${ClgClgScraper.sourceName}] Found ${totalPages} total pages. Will fetch up to ${pagesToFetch} pages.`);

    for (let page = 2; page <= pagesToFetch; page++) {
      await this._sleep(this.requestDelay);
      const pageUrl = `${this.baseUrl}/search-${encodedKeyword}-0-${sort}-${page}.html`;
      console.log(`[${ClgClgScraper.sourceName}] Fetching page ${page} from: ${pageUrl}`);
      const pageHtml = await this._fetchHtml(pageUrl);

      if (pageHtml) {
        const pageResults = this._parseHtml(pageHtml);
        allResults.push(...pageResults);
      }
    }

    console.log(`[${ClgClgScraper.sourceName}] Scraping finished. Total results found: ${allResults.length}`);
    return allResults;
  }

  /**
   * 私有方法：暂停执行
   */
  private _sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 私有方法：获取指定 URL 的 HTML 内容
   */
  private async _fetchHtml(url: string): Promise<string | null> {
    try {
      const response = await proxyRequest(url, { method: 'GET', headers: this.headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusCode} ${response.statusMessage}`);
      }
      return response.body;
    } catch (error) {
      console.error(`Error fetching URL ${url}:`, error);
      return null;
    }
  }

  /**
   * 私有方法：从HTML中解析出总页数
   */
  private _parseTotalPages(html: string): number {
    try {
      const $ = cheerio.load(html);
      const pagerText = $('.pager span:contains("共")').text(); // "共4页"
      const match = pagerText.match(/共\s*(\d+)\s*页/);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
      return 1; // 如果找不到分页信息，则认为只有1页
    } catch (e) {
      console.error("Could not parse total pages.", e);
      return 1;
    }
  }

  /**
   * 私有方法：解析 HTML 并提取所需数据
   */
  private _parseHtml(html: string): TorrentSearchResult[] {
    const $ = cheerio.load(html);
    const results: TorrentSearchResult[] = [];

    $('div.ssbox').each((index, element) => {
      const box = $(element);

      // 使用我们分析出的精确选择器
      const fileName = box.find('.title h3 a').text().trim();
      const magnet = box.find('.sbar a[href^="magnet:"]').attr('href') || '';

      // 提取 sbar 中的信息
      const sbarSpans = box.find('.sbar span');
      const createdAt = sbarSpans.find('b').eq(0).text().trim(); // 第一个 <b>
      const size = sbarSpans.find('b').eq(1).text().trim();      // 第二个 <b>
      const recentDownloads = sbarSpans.find('b').eq(2).text().trim(); // 第三个 <b>
      const heat = sbarSpans.find('b').eq(3).text().trim();      // 第四个 <b>

      // 提取文件列表
      const fileList: string[] = [];
      box.find('.slist ul li').each((_, liElem) => {
        // 克隆 li 元素，移除其中的 span，再获取文本，以去除文件大小信息
        const liClone = $(liElem).clone();
        liClone.find('span').remove();
        const file = liClone.text().replace(/&nbsp;/g, ' ').trim();
        if (file) {
          fileList.push(file);
        }
      });

      if (fileName && magnet) {
        results.push({
          magnet,
          createdAt,
          size,
          recentDownloads,
          heat,
          fileList,
          fileName,
        });
      }
    });

    return results;
  }
}