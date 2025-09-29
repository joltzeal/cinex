// src/app/api/proxy/route.ts

import { proxyFetch } from '@/lib/proxyFetch';
import { NextRequest, NextResponse } from 'next/server';

// 安全增强：只允许代理来自特定域名的图片
const ALLOWED_DOMAINS = [
  'www.javbus.com',
  'javbus.com',
  'pics.dmm.co.jp',
  'dmm.co.jp',
  'awsimgsrc.dmm.co.jp'
  // 在这里添加其他你需要的图片来源域名
];

export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get('url');

  // 1. 验证输入
  if (!imageUrl) {
    console.error('[IMAGE PROXY] No URL parameter provided');
    return new Response('URL parameter is required', { status: 400 });
  }


  let urlObject;
  try {
    urlObject = new URL(imageUrl);
  } catch (_) {
    console.error(`[IMAGE PROXY] Invalid URL format: ${imageUrl}`);
    return new Response('Invalid URL format', { status: 400 });
  }

  // 2. 安全检查：确保请求的域名在我们允许的白名单内
  if (!ALLOWED_DOMAINS.includes(urlObject.hostname)) {
    console.error(`[IMAGE PROXY] Domain not allowed: ${urlObject.hostname}`);
    return new Response('Domain not allowed for proxying', { status: 403 });
  }


  try {

    // 对于 javbus.com 域名，使用更简单的请求头
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'accept-language': 'zh-CN,zh;q=0.9',
      'cache-control': 'no-cache',
      'dnt': '1',
      // 'origin': 'https://anybt.eth.link',
      'pragma': 'no-cache',
      'priority': 'u=1, i',
      // 'referer': 'https://anybt.eth.link/',
      'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
    };

    // 只为 javbus.com 添加 Referer
    if (urlObject.hostname.includes('javbus.com')) {
      headers['Referer'] = `${urlObject.protocol}//${urlObject.hostname}/`;
    }

    const imageResponse = await proxyFetch(imageUrl, {
      headers,
    });


    // 4. 检查目标服务器的响应
    if (!imageResponse.ok) {
      console.error(`[IMAGE PROXY] Image fetch failed: ${imageResponse.status} ${imageResponse.statusText}`);
      return new Response(imageResponse.statusText, { status: imageResponse.status });
    }

    // 5. 将图片流式传回给客户端
    // 从原始响应中获取内容类型 (e.g., 'image/jpeg')
    const contentType = imageResponse.headers.get('content-type') || 'application/octet-stream';

    // 使用 ReadableStream 直接将数据从 fetch 管道传到响应，性能更高
    const stream = imageResponse.body;

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // 添加强大的缓存头，浏览器和CDN（如Vercel）会缓存这张图片
        // 后续请求将直接从缓存加载，不会再请求你的API或源站，速度极快！
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error) {
    console.error(`[IMAGE PROXY] Failed to fetch ${imageUrl}:`, error);
    return new Response('Failed to fetch image', { status: 500 });
  }
}