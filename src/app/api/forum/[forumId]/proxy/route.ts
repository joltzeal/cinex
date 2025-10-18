import { NextRequest, NextResponse } from 'next/server';
import { proxyFetch } from '@/lib/proxyFetch';
import { logger } from '@/lib/logger';

/**
 * 论坛图片代理端点
 * 用于代理需要特殊处理的图片请求
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ forumId: string }> }
) {
  try {
    const { forumId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // 验证 URL 格式
    let targetUrl: URL;
    try {
      targetUrl = new URL(imageUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    logger.info(`Proxying image for ${forumId}: ${imageUrl}`);

    // 根据不同论坛设置不同的请求头
    const headers: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Referer': targetUrl.origin + '/',
    };

    // 特定论坛的额外配置
    if (forumId === 'sehuatang') {
      // 色花堂可能需要特殊的 cookie 或 header
      headers['Referer'] = 'https://www.sehuatang.net/';
    } else if (forumId === 'javbus') {
      headers['Referer'] = 'https://www.javbus.com/';
    }

    // 使用 proxyFetch 获取图片
    const response = await proxyFetch(imageUrl, {
      headers,
    });

    if (!response.ok) {
      logger.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: 'Failed to fetch image' },
        { status: response.status }
      );
    }

    // 获取图片数据
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // 返回图片，设置适当的缓存头
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // 缓存一年
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    logger.error(`Error in forum image proxy: ${error}`);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

