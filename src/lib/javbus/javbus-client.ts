import type { Agent as HttpsAgent } from 'node:https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import got, { Got, type ExtendOptions } from 'got';
import { JAVBUS_TIMEOUT, USER_AGENT } from '@/constants/data';
import { getProxyUrl } from '@/services/settings';

// export default client;
export async function getAgent() {
  const proxyUrl = await getProxyUrl();
  if (!proxyUrl) {
    return undefined;
  }
  const PROXY_URL = proxyUrl.proxyUrl;
  if (PROXY_URL) {
    if (/^https?:\/\//.test(PROXY_URL)) {
      return new HttpsProxyAgent(PROXY_URL) as HttpsAgent;
    } else if (/^socks/.test(PROXY_URL)) {
      return new SocksProxyAgent(PROXY_URL) as HttpsAgent;
    }
  }
  return undefined;
}

export async function getJavbusClient(): Promise<Got<ExtendOptions>> {
  // const PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

  // let agent: HttpsAgent | undefined = undefined;

  // if (PROXY_URL) {
  //   if (/^https?:\/\//.test(PROXY_URL)) {
  //     agent = new HttpsProxyAgent(PROXY_URL) as HttpsAgent;
  //   } else if (/^socks/.test(PROXY_URL)) {
  //     agent = new SocksProxyAgent(PROXY_URL) as HttpsAgent;
  //   }
  // }

  const extendOptions: ExtendOptions = {
    headers: {
      'User-Agent': USER_AGENT,
      'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7'
    },
    timeout: {
      request: JAVBUS_TIMEOUT
    }
  };
  const _agent = await getAgent();
  if (_agent) {
    extendOptions.agent = { http: _agent, https: _agent };
  }
  const client = got.extend(extendOptions);
  // return client.extend(extendOptions);
  return client;
}
