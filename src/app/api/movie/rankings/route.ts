import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/proxyFetch';
import {
  ARANKINGS_CCESS_DENIED_MESSAGE,
  RANKINGS_CACHE_DURATION_MS,
  RANKINGS_JAVDB_BASE_URL,
  USER_AGENT
} from '@/constants/data';
import { parseAvfanVideoList } from '@/lib/rankings/avfan';
import { parseOnejavVideoList } from '@/lib/rankings/onejav';
import { parseVideoList } from '@/lib/javdb/javdb-parser';
import { VideoInfo } from '@/types/javdb';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
function ip6SafeRegex(): RegExp {
  // 参考多段组合写法，覆盖 8 组、压缩、尾部省略、多种展开
  const part = "[A-Fa-f0-9]{1,4}";
  const ipv6Std = `(?:${part}:){7}${part}`;
  const ipv6CompressedVariants = [
    `(?:${part}:){1,7}:`,
    `:${part}(?::${part}){1,7}`,
    `(?:${part}:){1,6}:${part}`,
    `(?:${part}:){1,5}(?::${part}){1,2}`,
    `(?:${part}:){1,4}(?::${part}){1,3}`,
    `(?:${part}:){1,3}(?::${part}){1,4}`,
    `(?:${part}:){1,2}(?::${part}){1,5}`,
    `${part}(?::${part}){1,6}`,
    `:(?::${part}){1,7}`,
    `::`,
  ];
  const full = `\\b(?:${ipv6Std}|${ipv6CompressedVariants.join("|")})\\b`;
  return new RegExp(full, "i");
}

// 严格 IPv4（每段 0–255）
const ipv4Strict =
  /\b(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\b/;

// IPv6 完整正则（支持标准、压缩、带嵌套 IPv4、区分大小写无关，支持 :: 缩写）
const ipv6 =
  /\b(?:(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}|(?:[A-Fa-f0-9]{1,4}:){1,7}:|:(?::[A-Fa-f0-9]{1,4}){1,7}|(?:[A-Fa-f0-9]{1,4}:){1,6:[A-Fa-f0-9]{1,4}}|(?:[A-Fa-f0-9]{1,4}:){1,5(?::[A-Fa-f0-9]{1,4}){1,2}}|(?:[A-Fa-f0-9]{1,4}:){1,4(?::[A-Fa-f0-9]{1,4}){1,3}}|(?:[A-Fa-f0-9]{1,4}:){1,3(?::[A-Fa-f0-9]{1,4}){1,4}}|(?:[A-Fa-f0-9]{1,4}:){1,2(?::[A-Fa-f0-9]{1,4}){1,5}}|[A-Fa-f0-9]{1,4}:(?:(?::[A-Fa-f0-9]{1,4}){1,6})|(?::(?::[A-Fa-f0-9]{1,4}){1,7}))\b/;

// 更稳妥的 IPv6 组合（包含 IPv4 嵌套形式，如 ::ffff:192.0.2.128）
const ipv6WithEmbeddedIPv4 =
  /\b(?:(?:[A-Fa-f0-9]{1,4}:){6}(?:\d{1,3}\.){3}\d{1,3}|(?:[A-Fa-f0-9]{1,4}:){0,5}:(?:\d{1,3}\.){3}\d{1,3}|::(?:[A-Fa-f0-9]{1,4}:){0,4}(?:\d{1,3}\.){3}\d{1,3})\b/;

/**
 * 提取文本中的唯一 IP（IPv4 或 IPv6）。如果找到多个，默认返回第一个。
 * @param text 多行字符串
 * @param preferIPv6 如果同一位置既可能是 IPv4 又可能是 IPv6（极少见），可选是否优先 IPv6
 * @returns 单个 IP 字符串或 null
 */
export function extractSingleIP(text: string, preferIPv6: boolean = true): string | null {
  // 先尝试匹配 IPv6（含嵌套 IPv4 的 IPv6 表示），再匹配纯 IPv4
  const ipv6Match =
    text.match(ipv6WithEmbeddedIPv4)?.[0] ??
    text.match(ip6SafeRegex())?.[0] ?? // 使用构造函数生成更可靠的 IPv6 正则
    null;

  const ipv4Match = text.match(ipv4Strict)?.[0] ?? null;

  if (preferIPv6) {
    return ipv6Match ?? ipv4Match;
  }
  return ipv4Match ?? ipv6Match;
}

async function addMovieStatus(videoList: VideoInfo[]): Promise<VideoInfo[]> {
  const movies = await prisma.movie.findMany({
    where: {
      number: {
        in: videoList.map((video) => video.code!)
      }
    }
  });
  return videoList.map((video) => {
    const movie = movies.find((movie: any) => movie.number === video.code);
    return {
      ...video,
      status: movie?.status
    };
  });
}

interface CacheEntry {
  data: VideoInfo[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * A custom error to handle specific API responses, like access denials.
 */
class AccessDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccessDeniedError';
  }
}

/**
 * A generic caching wrapper for fetching video lists.
 * It handles cache hits, misses, and stale data eviction.
 *
 * @param cacheKey - A unique key to identify the resource in the cache.
 * @param fetcher - An async function that fetches and parses the data, returning a VideoInfo array.
 * @returns A NextResponse object with the data and appropriate cache headers.
 */
async function getCachedData(
  cacheKey: string,
  fetcher: () => Promise<VideoInfo[]>
): Promise<NextResponse> {
  // 1. Check cache
  const cachedEntry = cache.get(cacheKey);
  if (cachedEntry) {
    const isCacheValid =
      Date.now() - cachedEntry.timestamp < RANKINGS_CACHE_DURATION_MS;
    if (isCacheValid) {
      return NextResponse.json(
        {
          success: true,
          data: cachedEntry.data
        },
        { headers: { 'X-Cache': 'HIT' } }
      );
    } else {
      cache.delete(cacheKey);
    }
  }

  // 2. Cache miss or stale: fetch fresh data
  try {
    const videoList = await fetcher();

    // 3. Store fresh data in cache
    if (videoList.length > 0) {
      cache.set(cacheKey, {
        data: videoList,
        timestamp: Date.now()
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: videoList
      },
      { headers: { 'X-Cache': 'MISS' } }
    );
  } catch (error) {
    
    // Handle specific, known errors from the fetcher
    if (error instanceof AccessDeniedError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message
        },
        { status: 403 }
      );
    }

    // Handle generic errors
    return NextResponse.json(
      {
        success: false,
        error: `无法获取数据，请稍后再试.`
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const website = searchParams.get('website');
  const period = searchParams.get('period');

  if (!website || !period) {
    return NextResponse.json(
      { error: "Missing required parameters: 'website' and 'period'" },
      { status: 400 }
    );
  }

  // --- Onejav Branch ---
  if (website === 'onejav') {
    const cacheKey = `onejav:${period}`;
    return getCachedData(cacheKey, async () => {
      const response = await proxyRequest(
        `https://onejav.com/popular/${period}?page=1&jav=1`,
        {
          method: 'GET',
          headers: { 'User-Agent': USER_AGENT }
        }
      );
      const body = response.body;
      if (!body) {
        throw new Error('Failed to fetch');
      }
      return await addMovieStatus(
        parseOnejavVideoList(body.toString(), 'https://onejav.com')
      );
    });
  }

  // --- Avfan Branch ---
  else if (website === 'avfan') {
    const cacheKey = `avfan:${period}`;
    return getCachedData(cacheKey, async () => {
      console.log(`https://avfan.com/zh-CN/rankings/fanza_ranking?t=${period}`);
      const response = await proxyRequest(
        
        `https://avfan.com/zh-CN/rankings/fanza_ranking?t=${period}`,
        {
          method: 'GET',
          headers: {
            'User-Agent': USER_AGENT,
            'accept-language': 'zh-CN,zh;q=0.9'
          }
        }
      );
      
      
      const body = response.body;
      // console.log(body);
      
      if (!body) {
        throw new Error('Failed to fetch');
      }
      return await addMovieStatus(parseAvfanVideoList(body.toString()));
    });
  }

  // --- JavDB Branch ---
  else if (website === 'javdb') {
    const cacheKey = `javdb:${period}`;
    return getCachedData(cacheKey, async () => {
      const url = `${RANKINGS_JAVDB_BASE_URL}?p=${period}&t=censored`;

      try {
        const response = await proxyRequest(url, {
          method: 'GET',
          headers: { 'User-Agent': USER_AGENT }
        });


        const bodyText = response.body;

        
        return await addMovieStatus(parseVideoList(bodyText));
      } catch (error: any) {
        // 如果是 AccessDeniedError，直接抛出让 getCachedData 处理
        if (error instanceof AccessDeniedError) {
          throw error;
        }

        // got 会在非 2xx 状态码时抛出错误
        if (error.response) {
          
          // 检查错误响应中是否包含访问被拒绝的消息
          const errorBody = error.response.body || '';
          if (errorBody.includes(ARANKINGS_CCESS_DENIED_MESSAGE)) {
            throw new AccessDeniedError(
              '由於版權限制，本站禁止了你的網路所在國家的訪問。'
            );
          }

          if (errorBody.includes('於你的異常行為，管理員禁止了你的訪問，將在3-7日後解除。')) {
            throw new AccessDeniedError(
              `<${extractSingleIP(errorBody, false)}> 由於你的異常行為，管理員禁止了你的訪問，將在3-7日後解除。`
            );
          }

          throw new Error(`Failed to fetch: ${error.response.statusCode} ${error.response.statusMessage}`);
        }

        // 其他错误（网络错误等）
        console.error('Request error:', error.message);
        throw new Error(`Failed to fetch: ${error.message}`);
      }
    });
  }

  // --- Fallback for invalid website ---
  return NextResponse.json(
    { error: 'Invalid website specified' },
    { status: 400 }
  );
}
