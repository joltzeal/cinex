import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import type { Agent } from 'http';
import got from 'got';
import { getProxyUrl } from '@/services/settings';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 使用 curl 发送请求（用于绕过 Cloudflare）
 */
export async function curlRequest(url: string, options: any = {}) {
  const headers = options.headers || {};
  const method = options.method || 'GET';

  // 构建 curl 命令
  let curlCmd = `curl -X ${method} '${url}'`;

  // 添加 headers
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'cookie') {
      curlCmd += ` -b '${value}'`;
    } else {
      curlCmd += ` -H '${key}: ${value}'`;
    }
  }

  // 添加代理
  const PROXY_URL = await getProxyUrl();
  if (PROXY_URL && PROXY_URL.proxyUrl) {
    curlCmd += ` -x '${PROXY_URL.proxyUrl}'`;
  }

  // 添加其他选项
  curlCmd += ' -s -i'; // -s 静默模式, -i 包含响应头

  try {
    const { stdout } = await execAsync(curlCmd, {
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });

    // 解析响应
    const [headersPart, ...bodyParts] = stdout.split('\r\n\r\n');
    const body = bodyParts.join('\r\n\r\n');

    // 解析状态码
    const statusLine = headersPart.split('\r\n')[0];
    const statusMatch = statusLine.match(/HTTP\/[\d.]+ (\d+)/);
    const statusCode = statusMatch ? parseInt(statusMatch[1]) : 200;

    // 解析响应头
    const responseHeaders: Record<string, string> = {};
    const headerLines = headersPart.split('\r\n').slice(1);
    for (const line of headerLines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim().toLowerCase();
        const value = line.substring(colonIndex + 1).trim();
        responseHeaders[key] = value;
      }
    }

    return {
      statusCode,
      headers: responseHeaders,
      body,
      statusMessage: statusLine.split(' ').slice(2).join(' ')
    };
  } catch (error: any) {
    throw new Error(`Curl request failed: ${error.message}`);
  }
}

/**
 * 使用代理发送 HTTP 请求
 * 支持 HTTP/HTTPS/SOCKS 代理协议
 * @param url - 请求的 URL
 * @param options - got 请求选项
 * @returns got 响应对象
 */
export async function proxyRequest(url: string, options: any = {}) {
  const PROXY_URL = await getProxyUrl();

  const gotOptions = {
    ...(options as any),
    followRedirect: true,
    throwHttpErrors: false,
    retry: {
      limit: 0
    },
    timeout: {
      request: 30000
    }
  };
  

  if (!PROXY_URL || PROXY_URL.proxyUrl === '') {
    console.log('未使用 proxy url');
    
    const response = await got(url, gotOptions);

    if (response.statusCode >= 400) {
      const error: any = new Error(`Request failed with status code ${response.statusCode} (${response.statusMessage}): ${options.method || 'GET'} ${url}`);
      error.response = response;
      throw error;
    }

    return response;
  }

  const proxyUrl = PROXY_URL.proxyUrl;
  let agent: Agent | undefined = undefined;

  if (/^https?:\/\//.test(proxyUrl)) {
    agent = new HttpsProxyAgent(proxyUrl);
  } else if (/^socks/.test(proxyUrl)) {
    // 支持 socks, socks5, socks4 等协议
    agent = new SocksProxyAgent(proxyUrl);
  } else {
    console.warn(
      `Unsupported proxy protocol in URL: "${proxyUrl}". The request will proceed without a proxy.`
    );
  }

  const response = await got(url, {
    ...gotOptions,
    agent: {
      http: agent,
      https: agent
    }
  });

  if (response.statusCode >= 400) {
    const error: any = new Error(`Request failed with status code ${response.statusCode} (${response.statusMessage}): ${options.method || 'GET'} ${url}`);
    error.response = response;
    throw error;
  }

  return response;
}
