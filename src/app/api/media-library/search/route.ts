import { NextRequest, NextResponse } from 'next/server';
import {
  findMediaItemByIdOrTitle,
  getMediaLibraryCache,
  processMediaItemsForNumbers,
  refreshMediaLibraryCache
} from '@/lib/tasks/media-library';
import { JellyfinMediaItem } from '@/lib/media-library/jellyfin-client';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { getMovieDetail, getMovieMagnets, getPoster } from '@/lib/javbus/javbus-parser';
import { Magnet, MovieDetail } from '@/types/javbus';
import { Prisma, MovieStatus } from '@prisma/client';
import { HTTPError } from 'got';

/**
 * GET /api/media-library/search
 * 
 * 查询参数：
 * - id: 番号（如 SSIS-001）
 * - title: 标题（如 美女）
 * - refresh: 是否刷新缓存（true/false）
 * 
 * 示例：
 * - /api/media-library/search?id=SSIS-001
 * - /api/media-library/search?title=美女
 * - /api/media-library/search?id=SSIS-001&refresh=true
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('id');
    const title = searchParams.get('title');
    const shouldRefresh = searchParams.get('refresh') === 'true';

    // 参数验证
    if (!sourceId && !title) {
      return NextResponse.json(
        { error: '必须提供 id 或 title 参数' },
        { status: 400 }
      );
    }

    // 如果请求刷新缓存
    if (shouldRefresh) {
      await refreshMediaLibraryCache();
    }

    // 查找媒体项
    const mediaItem = findMediaItemByIdOrTitle(sourceId || undefined, title || undefined);

    if (!mediaItem) {
      return NextResponse.json(
        {
          error: '未找到匹配的媒体项',
          searchParams: { sourceId, title }
        },
        { status: 404 }
      );
    }

    // 返回媒体项信息
    return NextResponse.json({
      success: true,
      data: {
        id: mediaItem.Id,
        name: mediaItem.Name,
        originalTitle: mediaItem.OriginalTitle,
        type: mediaItem.Type,
        path: mediaItem.Path,
        year: mediaItem.ProductionYear,
        rating: mediaItem.CommunityRating,
        overview: mediaItem.Overview,
        premiereDate: mediaItem.PremiereDate,
      },
      cache: {
        totalItems: getMediaLibraryCache().items.length,
        lastUpdated: getMediaLibraryCache().lastUpdated,
      }
    });

  } catch (error) {
    console.error('[API] 媒体库查询失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误', message: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await refreshMediaLibraryCache();
    const a = getMediaLibraryCache().items;
    const list: JellyfinMediaItem[] = getMediaLibraryCache().items;
    const { matchedItems, unmatchedItems, allExtractedNumbers, duplicateNumbers } = processMediaItemsForNumbers(list);
    logger.info(`媒体库中提取到的番号数量: ${allExtractedNumbers.length}`);
    const inDbNumbers = await prisma.movie.findMany({
      select: {
        number: true
      },
      where: {
        number: {
          in: allExtractedNumbers
        }
      }
    });

    logger.info(`在数据库中存在的番号数量: ${inDbNumbers.map((item: { number: any; }) => item.number)}`);
    const allExtractedNumbersSet = new Set(allExtractedNumbers);
    logger.info(`在数据库中不存在的番号数量: ${allExtractedNumbersSet.size - inDbNumbers.length}`);
    const notInDbNumbers = allExtractedNumbers.filter(item => !inDbNumbers.some((dbItem: { number: string; }) => dbItem.number === item));
    for (const itemNumber of notInDbNumbers) {
      try {
        logger.info(`开始获取番号: ${itemNumber},时间: ${new Date().toISOString()}`);
        const movieDetail: MovieDetail = await getMovieDetail(itemNumber);
        // TODO: 添加搜索错误处理
        const magnets: Magnet[] = await getMovieMagnets({
          movieId: movieDetail.id,
          gid: movieDetail.gid!,
          uc: movieDetail.uc!,
          sortBy: 'date',
          sortOrder: 'desc'

        });
        await prisma.movie.upsert({
          where: { number: movieDetail.id },
          update: {
          },
          create: {
            number: movieDetail.id,
            title: movieDetail.title,
            detail: movieDetail as unknown as Prisma.InputJsonValue,
            magnets: magnets as unknown as Prisma.InputJsonValue,
            cover: movieDetail.img,
            poster: getPoster(movieDetail.img!) ?? null,
            date: movieDetail.date,
            status: MovieStatus.uncheck,
          }
        });

      } catch (error) {
        if (error instanceof HTTPError) {
          logger.error(`无法在 Javbus 获取到${itemNumber} 的详情`);
        }
        logger.error(`获取番号: ${itemNumber} 失败: ${error}`);
      } finally {
        // 添加等待
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    return NextResponse.json({ success: true, data: allExtractedNumbers.length }, { status: 200 });
  } catch (error) {
    
    console.error('[API] 媒体库查询失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误', message: String(error) },
      { status: 500 }
    );
  }
}