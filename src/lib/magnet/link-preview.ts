import { logger } from "../logger";
import { proxyRequest } from "../proxyFetch";

// 定义成功的 API 响应接口
export interface PreviewResponse {
  type: string;
  file_type: string;
  name: string;
  size: number;
  count: number;
  screenshots: { time: number; screenshot: string }[] | null; // screenshots 可能是 null
}

// 🔥 新增：定义一个更通用的类型来处理成功或失败的响应体
type WhatslinkApiResponse = Partial<PreviewResponse> & {
  error?: string;
};

class LinkPreview {
  constructor() { }
}

export class WhatslinkPreview extends LinkPreview {
  /**
   * Fetches preview data for a magnet link from the Whatslink API.
   * @param magnetLink The magnet link to preview.
   * @returns A promise that resolves with the preview data.
   * @throws An error if the API request fails, is rate-limited, or reports an error.
   */
  async getPreview(magnetLink: string): Promise<PreviewResponse> {
    const apiUrl = `https://whatslink.info/api/v1/link?url=${encodeURIComponent(magnetLink)}`;

    // 1. 定义要轮流尝试的 Origin 列表
    const origins = [
      'https://whatslink.info',
      'https://magnet.pages.dev',
      'https://tmp.nulla.top',
      // 您可以在这里添加更多备用的 origin
    ];

    // 2. 定义基础的请求头，Origin 和 Referer 将在循环中动态设置
    const baseHeaders = {
      'accept': 'application/json',
      'accept-language': 'zh-CN,zh;q=0.9',
      'cache-control': 'no-cache',
      'dnt': '1',
      'pragma': 'no-cache',
      'priority': 'u=1, i',
      'sec-ch-ua': '"Chromium";v="141", "Not?A_Brand";v="8"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
    };

    // 3. 用于存储最后一次失败的错误信息
    let lastError: Error | null = null;

    // 4. 循环尝试每一个 origin
    for (const origin of origins) {

      try {
        const headers = {
          ...baseHeaders,
          'Origin': origin,
          // 通常 Referer 和 Origin 应该匹配，这能提高成功率
          'Referer': `${origin}/`,
        };

        const response = await proxyRequest(apiUrl, {
          method: 'GET',
          headers: headers,
        });

        // 检查 HTTP 级别的错误
        if (!response.ok) {
          // 如果 HTTP 状态码不为 2xx，则构造一个错误并抛出，以便进入 catch 块
          const errorBody = response.body;
          throw new Error(`HTTP 错误 ${response.statusCode}。来自 Origin: ${origin}。响应体: ${errorBody}`);
        }


        const data: WhatslinkApiResponse = JSON.parse(response.body as string);

        // 检查应用级别的错误 (即 API 返回的 JSON 中包含 error 字段)
        if (data.error) {
          const errorMessage = data.name || `未知 API 错误: ${data.error}`;
          throw new Error(`API 报告错误。来自 Origin: ${origin}。错误信息: ${errorMessage}`);
        }

        // 5. 如果代码执行到这里，说明请求完全成功！
        // 直接返回成功的结果，函数将在此处终止
        return data as PreviewResponse;

      } catch (error) {
        // 6. 如果 fetch 或后续检查中抛出了任何错误
        lastError = error as Error;
        logger.warn(`使用 Origin: ${origin} 的尝试失败了:`);
        // 循环将自动继续，尝试下一个 origin
      }
    }

    // 7. 如果循环结束后仍然没有成功返回，说明所有 origin 都已失败
    logger.error("获取磁力链接预览数据失败");
    // 抛出最后一次捕获到的错误，或一个总结性的错误
    throw new Error(`获取磁力链接预览数据失败: ${lastError?.message || '未知错误'}`);
  }
}