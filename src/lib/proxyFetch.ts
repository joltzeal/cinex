import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import type { Agent } from 'http';
import got from 'got';
import { getProxyUrl } from '@/services/settings';

/**
 * 使用代理发送 HTTP 请求
 * 支持 HTTP/HTTPS/SOCKS 代理协议
 * @param url - 请求的 URL
 * @param options - got 请求选项
 * @returns got 响应对象
 */
export async function proxyRequest(url: string, options: any = {}) {
  const PROXY_URL = await getProxyUrl();
  if (!PROXY_URL) {
    return await got(url, {
      ...(options as any)
    });
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
    ...(options as any),
    agent: {
      http: agent,
      https: agent
    }
  });
  
  return response;
}
