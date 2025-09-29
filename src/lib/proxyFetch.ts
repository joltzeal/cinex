import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import type { Agent } from 'http';

// 扩展 RequestInit 类型以包含 Node.js 特有的 agent 属性
interface NodeRequestInit extends RequestInit {
  agent?: Agent;
}

/**
 *
 * @param url - fetch 的第一个参数 (URL 或 Request 对象)。
 * @param options - fetch 的第二个参数 (配置对象)。
 * @returns 返回 fetch 的 Promise。
 */
export async function proxyFetch(
  url: string | URL | Request,
  options: NodeRequestInit = {}
): Promise<Response> {
  // 1. 按优先级顺序获取代理环境变量
  const PROXY_URL =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.ALL_PROXY ||
    process.env.all_proxy;

  // 如果没有设置代理，则直接返回普通 fetch
  if (!PROXY_URL) {
    return fetch(url, options);
  }

  

  // 2. 根据代理 URL 的协议选择并创建合适的 Agent
  // 使用 Agent 类型作为统一的类型，它是 HttpsProxyAgent 和 SocksProxyAgent 的基类
  let agent: Agent | undefined = undefined;

  if (/^https?:\/\//.test(PROXY_URL)) {
    agent = new HttpsProxyAgent(PROXY_URL);
  } else if (/^socks/.test(PROXY_URL)) {
    // 支持 socks, socks5, socks4 等协议
    agent = new SocksProxyAgent(PROXY_URL);
  } else {
    console.warn(
      `Unsupported proxy protocol in URL: "${PROXY_URL}". The request will proceed without a proxy.`
    );
  }

  // 3. 将 agent 添加到 fetch 的配置中
  const newOptions: NodeRequestInit = { ...options };
  
  if (agent) {
    // Node.js 的 fetch API 直接在 options 对象上接收 agent 属性
    newOptions.agent = agent;
  }

  return fetch(url, newOptions);
}