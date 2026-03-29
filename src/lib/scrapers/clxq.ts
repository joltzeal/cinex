import * as cheerio from 'cheerio';
import { proxyRequest } from '@/lib/proxyFetch';
import { IScraper, TorrentSearchResult } from './interface';

export class CLXQ implements IScraper {
  public static readonly sourceName = '磁力星球';

  private readonly baseUrl = 'https://div.xingqiu.icu';

  private readonly headers: HeadersInit = {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'zh,en;q=0.9,zh-CN;q=0.8',
    'cache-control': 'no-cache',
    'pragma': 'no-cache',
    'priority': 'u=0, i',
    'referer': 'https://div.xingqiu.icu/',
    'sec-ch-ua': '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'iframe',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
  };

  private readonly sortMap: Record<number, string> = {
    0: 'rel',
    1: 'size',
    2: 'date',
    3: 'rel',
    4: 'rel',
  };

  public async search(keyword: string, sort: number): Promise<TorrentSearchResult[]> {
    const sortParam = this.sortMap[sort] || 'rel';
    const searchUrl = `${this.baseUrl}/search?word=${encodeURIComponent(keyword)}&ap=6&sort=${sortParam}&page=1`;

    try {
      console.log(`[${CLXQ.sourceName}] Fetching page 1 from: ${searchUrl}`);
      const response = await proxyRequest(searchUrl, {
        method: 'GET',
        headers: this.headers,
      });

      console.log(
        `[${CLXQ.sourceName}] Response status=${response.statusCode}, bodyLength=${response.body?.length || 0}`
      );
      console.log(
        `[${CLXQ.sourceName}] Response preview: ${(response.body || '').slice(0, 800)}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusCode} ${response.statusMessage}`);
      }

      const results = this._parseHtml(response.body);
      console.log(`[${CLXQ.sourceName}] Scraping finished. Found ${results.length} results on page 1.`);
      return results;
    } catch (error: any) {
      const statusCode = error?.response?.statusCode || error?.statusCode || 'N/A';
      const body = error?.response?.body || '';
      console.error(`[${CLXQ.sourceName}] Error status=${statusCode}`);
      if (body) {
        console.error(`[${CLXQ.sourceName}] Error body preview: ${String(body).slice(0, 800)}`);
      }
      console.error(`[${CLXQ.sourceName}] Error during search:`, error);
      return [];
    }
  }

  private _parseHtml(html: string): TorrentSearchResult[] {
    const $ = cheerio.load(html);
    const results: TorrentSearchResult[] = [];

    $('ul.list-group > li.list-group-item').slice(3).each((_, element) => {
      const item = $(element);
      const titleLink = item.find('.title a').first();
      const detailPath = titleLink.attr('href') || '';
      const fileName = titleLink.text().trim();
      const infoHash = this._extractInfoHash(detailPath);

      if (!fileName || !infoHash) {
        return;
      }

      const metaText = item.find('.foo').text().replace(/\s+/g, ' ').trim();
      const size = metaText.match(/文件大小：(.+?)(?:\s+创建时间：|$)/)?.[1]?.trim() || 'N/A';
      const createdAt = metaText.match(/创建时间：(\d{4}-\d{2}-\d{2})/)?.[1] || 'N/A';

      const fileList: string[] = [];
      item.find('.sub-title').each((__, subTitle) => {
        const fileItem = $(subTitle).clone();
        fileItem.find('.badge').remove();
        fileItem.find('i').remove();
        const fileText = fileItem.text().replace(/\s+/g, ' ').trim();
        const fileSize = $(subTitle).find('.badge').text().replace(/\s+/g, ' ').trim();

        if (fileText) {
          fileList.push(fileSize ? `${fileText} (${fileSize})` : fileText);
        }
      });

      results.push({
        magnet: `magnet:?xt=urn:btih:${infoHash}`,
        fileName,
        size,
        createdAt,
        recentDownloads: 'N/A',
        heat: 'N/A',
        fileList,
      });
    });

    return results;
  }

  private _extractInfoHash(detailPath: string): string | null {
    const match = detailPath.match(/\/detail\/([a-fA-F0-9]{40})/);
    return match?.[1] || null;
  }
}
