// src/lib/scrapers/btdigg.ts
import * as cheerio from 'cheerio';
import { IScraper, TorrentSearchResult } from './interface';
import { proxyRequest } from '../proxyFetch';
// 移除了 https-proxy-agent 的导入

export class BtDiggScraper implements IScraper {
    public static readonly sourceName = 'btdigg';

    private readonly baseUrl = 'https://www.btdig.com';

    private readonly baseHeaders: HeadersInit = {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-language': 'zh-CN,zh;q=0.9',
        'cache-control': 'no-cache',
        'dnt': '1',
        'pragma': 'no-cache',
        'priority': 'u=0, i',
        'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
    };
    
    private sortMap: { [key: number]: number } = {
        0: 0, 1: 1, 2: 2, 3: 0, 4: 0,
    };

    // 移除了 constructor 和 proxyAgent 属性
    // 移除了 _sleep 方法

    private async _fetchHtml(url: string, referer: string): Promise<string | null> {
        // 移除了 _sleep 调用
        try {
            const headers = { ...this.baseHeaders, 'Referer': referer };
            const response = await proxyRequest(url, { 
                method: 'GET', 
                headers: headers,
                cache: 'no-cache'
            });

            if (!response.ok) {
                const errorBody = response.body;
                console.error(`[${BtDiggScraper.sourceName}] HTTP Error ${response.statusCode} Body:`, errorBody?.substring(0, 500));
                throw new Error(`Failed to fetch: ${response.statusCode} ${response.statusMessage}`);
            }
            return response.body;
        } catch (error) {
            console.error(`[${BtDiggScraper.sourceName}] Error in _fetchHtml for URL ${url}:`, error);
            return null;
        }
    }
    
    /**
     * 🔥 [重构] search 方法现在只请求第一页数据
     */
    public async search(keyword: string, sort: number): Promise<TorrentSearchResult[]> {
        // 1. 设置分页参数为 0 (第一页)
        const pageParam = 0; 
        const sortParam = this.sortMap[sort] || 0;

        // 2. 构建第一页的 URL 和 Referer
        const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(keyword)}&p=${pageParam}&order=${sortParam}`;
        const referer = `${this.baseUrl}/search?q=${encodeURIComponent(keyword)}`;

        console.log(`[${BtDiggScraper.sourceName}] Fetching page 1 from: ${searchUrl}`);
        
        // 3. 发起单次请求
        const html = await this._fetchHtml(searchUrl, referer);

        // 4. 如果请求失败或无内容，返回空数组
        if (!html) {
            console.log(`[${BtDiggScraper.sourceName}] Failed to fetch page 1. Returning empty results.`);
            return [];
        }

        // 5. 解析 HTML 并返回结果
        const results = this._parseHtml(html);
        console.log(`[${BtDiggScraper.sourceName}] Scraping finished. Found ${results.length} results on page 1.`);
        return results;
    }
    
    private _parseHtml(html: string): TorrentSearchResult[] {
        const $ = cheerio.load(html);
        const results: TorrentSearchResult[] = [];
        $('div.one_result').each((_, element) => {
            const item = $(element);
            const magnet = item.find('.torrent_magnet a').attr('href') || '';
            const fileName = item.find('h2 a').text().trim();
            const infoSpans = item.find('.torrent_info span');
            const size = infoSpans.first().text().trim() || 'N/A';
            const createdAt = infoSpans.eq(1).text().trim() || 'N/A';
            if (fileName && magnet) {
                results.push({
                    magnet, fileName, size, createdAt,
                    heat: 'N/A', recentDownloads: 'N/A', fileList: [],
                });
            }
        });
        return results;
    }
}