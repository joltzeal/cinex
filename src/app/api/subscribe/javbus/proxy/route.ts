import { ALLOWED_DOMAINS } from '@/constants/data';
import { proxyRequest } from '@/lib/proxyFetch';
import { NextRequest, NextResponse } from 'next/server';

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
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'accept-language': 'zh-CN,zh;q=0.9',
      'cache-control': 'no-cache',
      dnt: '1',
      // 'origin': 'https://anybt.eth.link',
      pragma: 'no-cache',
      priority: 'u=1, i',
      // 'referer': 'https://anybt.eth.link/',
      'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site'
    };

    // 只为 javbus.com 添加 Referer
    if (urlObject.hostname.includes('javbus.com')) {
      headers['Referer'] = `${urlObject.protocol}//${urlObject.hostname}/`;
    }

    const imageResponse = await proxyRequest(imageUrl, {
      headers,
      responseType: 'buffer'
    });

    if (
      imageResponse.statusCode &&
      (imageResponse.statusCode < 200 || imageResponse.statusCode >= 300)
    ) {
      console.error(
        `[IMAGE PROXY] Image fetch failed: ${imageResponse.statusCode} ${imageResponse.statusMessage}`
      );
      return new Response(
        imageResponse.statusMessage || 'Failed to fetch image from origin',
        { status: imageResponse.statusCode }
      );
    }

    // 5. 将图片流式传回给客户端
    // 从原始响应中获取内容类型 (e.g., 'image/jpeg')
    // got 的 headers 是一个 Headers 对象，可以直接访问
    const contentType =
      imageResponse.headers['content-type'] || 'application/octet-stream';
    // console.log("Content-Type from origin:", contentType);

    // imageResponse.body 现在已经是 Buffer 类型了，因为设置了 responseType: 'buffer'
    const imageBuffer = imageResponse.body;
    // console.log("Image Buffer Length:", imageBuffer.length);

    return new Response(imageBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error(`[IMAGE PROXY] Failed to fetch ${imageUrl}:`, error);
    return new Response('Failed to fetch image', { status: 500 });
  }
}
