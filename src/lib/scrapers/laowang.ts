import * as cheerio from 'cheerio';
import { IScraper, TorrentSearchResult } from './interface';
import {  proxyRequest } from '../proxyFetch';

export class LaoWangScraper implements IScraper {
  public static readonly sourceName = '老王磁力';

  private readonly baseUrl = 'https://laowangso.top';
  private readonly requestDelay = 600; // 请求延迟
  // 服务端静态变量，用于缓存Cookie，避免每次请求都重新获取
  private static cookie: string | null = null;
  private static cookieExpiration = 0;
  private static maxPage = 1;

  private readonly headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  };

  // 映射你的排序数字到网站的URL参数
  private sortMap: { [key: number]: string } = {
    0: 'relevance', // 相关度 (默认)
    1: 'size',      // 文件大小
    2: 'date',      // 添加时间
    3: 'hot',       // 热度
    // 4: 网站似乎没有对应选项，我们映射为默认
    4: 'relevance'
  };

  private static randomString(len: number, charSet?: string): string {
    charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';
    for (let i = 0; i < len; i++) {
      const randomPoz = Math.floor(Math.random() * charSet.length);
      randomString += charSet.substring(randomPoz, randomPoz + 1);
    }
    return randomString;
  }

  private static formatDate(fmt: string, date: Date): string {
    const o: { [key: string]: number } = {
      'M+': date.getMonth() + 1, 'd+': date.getDate(), 'h+': date.getHours(),
      'm+': date.getMinutes(), 's+': date.getSeconds(),
    };
    if (/(y+)/.test(fmt)) {
      fmt = fmt.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
    }
    for (const k in o) {
      if (new RegExp('(' + k + ')').test(fmt)) {
        const val = o[k].toString();
        fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? val : ('00' + val).substr(val.length));
      }
    }
    return fmt;
  }

  // ----------- 核心逻辑 -----------

  /**
   * 获取或刷新反爬虫Cookie
   * @param forceRefresh - 是否强制刷新Cookie
   * @returns 返回可用的Cookie字符串
   */
  private async _getCookie(forceRefresh = false): Promise<string> {
    if (!forceRefresh && LaoWangScraper.cookie && Date.now() < LaoWangScraper.cookieExpiration) {
      console.log(`[${LaoWangScraper.sourceName}] Using cached cookie.`);
      return LaoWangScraper.cookie;
    }

    console.log(`[${LaoWangScraper.sourceName}] Anti-bot: Fetching new cookie...`);
    const aywcUid = LaoWangScraper.randomString(10) + '_' + LaoWangScraper.formatDate('yyyyMMddhhmmss', new Date());

    const verifyUrl = `${this.baseUrl}/anti/recaptcha/v4/verify?token=${LaoWangScraper.randomString(100)}&aywcUid=${aywcUid}&costtime=${1000 + Math.floor(Math.random() * 1000)}`;

    console.log(`[${LaoWangScraper.sourceName}] Request URL: ${verifyUrl}`);
    console.log(`[${LaoWangScraper.sourceName}] Request headers:`, { ...this.headers, 'Cookie': `aywcUid=${aywcUid}` });

    const response = await proxyRequest(verifyUrl, {
      headers: { ...this.headers, 'Cookie': `aywcUid=${aywcUid}` },
      followRedirect: false
    });

    console.log(`[${LaoWangScraper.sourceName}] Response status: ${response.statusCode}`);
    console.log(`[${LaoWangScraper.sourceName}] Response headers:`, response.headers);

    const setCookieHeader = response.headers?.['set-cookie']?.toString();
    if (!setCookieHeader) {
      throw new Error("Failed to get anti-bot cookies from header.");
    }

    // 解析并组合Cookie
    const jsessionidMatch = setCookieHeader.match(/JSESSIONID=.*?;/);
    const fctMatch = setCookieHeader.match(/fct=.*?;/);

    if (!jsessionidMatch || !fctMatch) {
      throw new Error("Essential cookies (JSESSIONID or fct) not found.");
    }

    const newCookie = `${jsessionidMatch[0]} ${fctMatch[0]} aywcUid=${aywcUid}`;
    LaoWangScraper.cookie = newCookie;
    // 设置20分钟过期，强制刷新
    LaoWangScraper.cookieExpiration = Date.now() + 20 * 60 * 1000;

    console.log(`[${LaoWangScraper.sourceName}] Successfully got new cookie.`);
    return newCookie;
  }

  public async search(keyword: string, sort: number, maxPages: number = LaoWangScraper.maxPage): Promise<TorrentSearchResult[]> {
    let cookie = await this._getCookie();
    const allResults: TorrentSearchResult[] = [];
    for (let page = 1; page <= maxPages; page++) {
      if (page > 1) await new Promise(resolve => setTimeout(resolve, this.requestDelay));
      const sortParam = this.sortMap[sort] || 'relevance';
      const searchUrl = `${this.baseUrl}/search?keyword=${encodeURIComponent(keyword)}&sos=${sortParam}&sofs=all&sot=all&soft=all&som=auto&p=${page}`;
      console.log(`[${LaoWangScraper.sourceName}] Fetching page ${page} from: ${searchUrl}`);
      console.log(`[${LaoWangScraper.sourceName}] Request headers:`, { ...this.headers, 'Cookie': cookie, 'Referer': this.baseUrl });

      let response = await proxyRequest(searchUrl, { headers: { ...this.headers, 'Cookie': cookie, 'Referer': this.baseUrl } });
      console.log(`[${LaoWangScraper.sourceName}] Response status: ${response.statusCode}`);
      console.log(`[${LaoWangScraper.sourceName}] Response body length: ${response.body?.length || 0}`);

      if (response.statusCode !== 200) {
        console.log(`[${LaoWangScraper.sourceName}] Cookie might be invalid (status: ${response.statusCode}). Refreshing...`);
        cookie = await this._getCookie(true);
        response = await proxyRequest(searchUrl, { headers: { ...this.headers, 'Cookie': cookie, 'Referer': this.baseUrl } });
        if (response.statusCode !== 200) {
          console.error(`[${LaoWangScraper.sourceName}] Failed to fetch page ${page} even after cookie refresh.`);
          continue;
        }
      }
      const html = response.body;
      const pageResults = await this._parseHtmlAndFetchMagnets(html, searchUrl);
      allResults.push(...pageResults);
    }
    console.log(`[${LaoWangScraper.sourceName}] Scraping finished. Total results found: ${allResults.length}`);
    return allResults;
  }
  private _sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async _parseHtmlAndFetchMagnets(html: string, referer: string): Promise<TorrentSearchResult[]> {
    const $ = cheerio.load(html);
    const itemsToProcess: any[] = [];
    const finalResults: TorrentSearchResult[] = []; // 用于存储最终结果

    $('.search-panel:has(.panel-heading)').each((_, element) => {
      const panel = $(element);
      const titleElement = panel.find('.panel-heading h3.panel-title a');
      const fileName = titleElement.text().trim();
      const detailPageUrl = this.baseUrl + titleElement.attr('href');

      const footerElement = panel.find('.panel-footer');
      const size = footerElement.find('span').eq(0).text().trim();
      const fullDate = footerElement.find('span').eq(2).text().trim();
      const createdAt = fullDate.split(' ')[0] || 'N/A';

      const fileList: string[] = [];
      panel.find('.panel-body li').each((_, li) => {
        const individualFileName = $(li).find('span').first().text().trim();
        const individualFileSize = $(li).find('.badge').text().trim();
        if (individualFileName && individualFileSize) {
          fileList.push(`${individualFileName} (${individualFileSize})`);
        }
      });

      if (fileName && detailPageUrl && size && (size.includes('GB') || size.includes('MB'))) {
        itemsToProcess.push({ fileName, detailPageUrl, size, createdAt, fileList });
      }
    });

    for (const item of itemsToProcess) {
      console.log(`[${LaoWangScraper.sourceName}] Fetching magnet for: "${item.fileName}"`);
      const magnet = await this._getMagnetLink(item.detailPageUrl, referer);

      if (magnet) {
        finalResults.push({
          fileName: item.fileName,
          magnet,
          size: item.size,
          createdAt: item.createdAt,
          heat: 'N/A',
          fileList: item.fileList,
          recentDownloads: 'N/A',
        });
      }

      await this._sleep(this.requestDelay);
    }

    return finalResults;
  }

  private async _getMagnetLink(detailPageUrl: string, referer: string): Promise<string | null> {
    if (!LaoWangScraper.cookie) return null;
    try {
      const response = await proxyRequest(detailPageUrl, { headers: { ...this.headers, 'Cookie': LaoWangScraper.cookie, 'Referer': referer } });
      if (!response.ok) {
        console.error(`[${LaoWangScraper.sourceName}] Failed to fetch magnet from ${detailPageUrl}. Status: ${response.statusCode}`);
        return null;
      }
      const html = response.body;
      const $ = cheerio.load(html);
      return $('#magnet').attr('href') || null;
    } catch (error) {
      console.error(`[${LaoWangScraper.sourceName}] Error fetching magnet from ${detailPageUrl}`, error);
      return null;
    }
  }
}