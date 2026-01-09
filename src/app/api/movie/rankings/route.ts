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
      console.log(`body: ${body}`);
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
      const response = await proxyRequest(url, {
        method: 'GET',
        headers: { 'User-Agent': USER_AGENT }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch`);
      }

      const body = response.body;
      if (!body) {
        throw new Error('Failed to fetch');
      }

      // For JavDB, we have a specific access denied message to check for
      if (body.toString().includes(ARANKINGS_CCESS_DENIED_MESSAGE)) {
        throw new AccessDeniedError(
          '由於版權限制，本站禁止了你的網路所在國家的訪問。'
        );
      }
      return await addMovieStatus(parseVideoList(body.toString()));
    });
  }

  // --- Fallback for invalid website ---
  return NextResponse.json(
    { error: 'Invalid website specified' },
    { status: 400 }
  );
}
