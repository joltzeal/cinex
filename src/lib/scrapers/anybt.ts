import { proxyRequest } from '../proxyFetch';
import { IScraper, TorrentSearchResult } from './interface';

// 定义从 API 返回的单行数据的结构
interface AnyBtApiRow {
  result: {
    row: {
      _id: { value: string };
      file_name: { value: string };
      filesize: { value: string }; // string containing a number, possibly in scientific notation
      firstadd_utc_timestamp: { value: string }; // string containing a unix timestamp
      total_count: { value: string }; // string containing a number
    };
  }[]
}

export class AnyBtScraper implements IScraper {
  public static readonly sourceName = 'anybt';

  private readonly apiUrl = 'https://gw.magnode.ru/v1/sql/query';

  // 从 cURL 命令中提取的请求头
  private readonly headers: HeadersInit = {
    'accept': 'application/json',
    'accept-language': 'zh-CN,zh;q=0.9',
    'cache-control': 'no-cache',
    'content-type': 'application/json',
    'dnt': '1',
    'origin': 'https://anybt.eth.link',
    'pragma': 'no-cache',
    'priority': 'u=1, i',
    'referer': 'https://anybt.eth.link/',
    'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'cross-site',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
  };

  /**
   * 字节数格式化为可读字符串
   */
  private _formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Unix 时间戳 (秒) 格式化为 YYYY-MM-DD
   */
  private _formatTimestamp(timestamp: number): string {
    // toISOString() returns 'YYYY-MM-DDTHH:mm:ss.sssZ', we just want the date part.
    return new Date(timestamp * 1000).toISOString().split('T')[0];
  }

  public async search(keyword: string, sort: number): Promise<TorrentSearchResult[]> {
    // 注意：该 API 的排序机制内置于 SQL 查询中，此处的 sort 参数暂时未使用。
    // 默认按相关度排序。

    // 构造请求体
    const body = {
      sql: `select /*+ SET_VAR(full_text_option='{\"highlight\":{ \"style\":\"html\",\"fields\":[\"file_name\"]}}') */ file_name,filesize,total_count,_id,category,firstadd_utc_timestamp,_score from library.dht where query_string('file_name:${keyword}^1') limit 0, 200`,
      dataset_name: "anybt",
      arguments: []
    };

    try {
      console.log(`[${AnyBtScraper.sourceName}] Fetching data for keyword: "${keyword}"`);

      const response = await proxyRequest(this.apiUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.statusCode}`);
      }

      const responseData: AnyBtApiRow = JSON.parse(response.body as string);



      if (!Array.isArray(responseData.result)) {
        console.error(`[${AnyBtScraper.sourceName}] Unexpected response format.`);
        return [];
      }

      // 将 API 返回的数据映射到我们的标准接口
      const results = responseData.result.map(({ row }): TorrentSearchResult => {
        const infoHash = row._id.value;
        const timestamp = parseFloat(row.firstadd_utc_timestamp.value);
        const formattedDate = this._formatTimestamp(timestamp);

        return {
          magnet: `magnet:?xt=urn:btih:${infoHash}`,
          fileName: row.file_name.value,
          size: this._formatBytes(parseFloat(row.filesize.value)),
          createdAt: formattedDate,
          recentDownloads: formattedDate, // 使用创建时间作为最近下载时间
          heat: row.total_count.value,
          fileList: [], // 该站点不提供文件列表
        };
      });

      console.log(`[${AnyBtScraper.sourceName}] Scraping finished. Found ${results.length} results.`);
      return results;

    } catch (error) {
      console.error(`[${AnyBtScraper.sourceName}] Error during search:`, error);
      return []; // 出错时返回空数组
    }
  }
}