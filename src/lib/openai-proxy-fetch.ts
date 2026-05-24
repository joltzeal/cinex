import type { Agent } from 'http';
import { Readable } from 'stream';
import got from 'got';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

function createProxyAgent(proxyUrl?: string | null) {
  if (!proxyUrl) {
    return undefined;
  }

  if (/^https?:\/\//.test(proxyUrl)) {
    return new HttpsProxyAgent(proxyUrl);
  }

  if (/^socks/.test(proxyUrl)) {
    return new SocksProxyAgent(proxyUrl);
  }

  throw new Error(`不支持的代理协议：${proxyUrl}`);
}

function headersToObject(headers?: HeadersInit) {
  if (!headers) {
    return undefined;
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return headers;
}

function readableToWeb(stream: NodeJS.ReadableStream) {
  return Readable.toWeb(stream as Readable) as ReadableStream<Uint8Array>;
}

export function createOpenAIProxyFetch(proxyUrl?: string | null) {
  const agent = createProxyAgent(proxyUrl);

  if (!agent) {
    return undefined;
  }

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const request = input instanceof Request ? input : undefined;
    const method = init?.method || request?.method || 'GET';
    const headers = {
      ...headersToObject(request?.headers),
      ...headersToObject(init?.headers)
    };
    const body = init?.body ?? request?.body ?? undefined;

    const stream = got.stream(url, {
      method,
      headers,
      body: body as any,
      agent: {
        http: agent as Agent,
        https: agent as Agent
      },
      throwHttpErrors: false,
      retry: { limit: 0 },
      signal: init?.signal || request?.signal
    });

    const response = await new Promise<Response>((resolve, reject) => {
      stream.once('response', (gotResponse) => {
        resolve(
          new Response(readableToWeb(stream), {
            status: gotResponse.statusCode,
            statusText: gotResponse.statusMessage,
            headers: gotResponse.headers as HeadersInit
          })
        );
      });
      stream.once('error', reject);
    });

    return response;
  };
}
