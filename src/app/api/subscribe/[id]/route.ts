import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';
import { getMovieDetail, getMovieMagnets } from '@/lib/javbus/javbus-parser';
import { Magnet } from '@/types/javbus';

// 根据 subscribe 进行订阅
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const subscribe = await prisma.subscribe.findUnique({
    where: { id },
    include: {
      movies: true
    }
  });
  if (!subscribe) {
    return NextResponse.json({ error: 'Subscribe not found' }, { status: 404 });
  }
  const movies = subscribe.movies;

  return NextResponse.json(subscribe);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const nullDetailMovies = await prisma.movie.findMany({
      where: {
        subscribes: {
          some: {
            subscribeId: id
          }
        },
        detail: {
          equals: Prisma.DbNull
        }
      }
    });

    logger.info(`找到 ${nullDetailMovies.length} 部没有详情的影片`);

    // 并发请求配置
    const BATCH_SIZE = 2; // 每批并发数
    const DELAY_MS = 1000; // 每批之间的延迟（毫秒）

    // 将电影列表分批
    const batches = [];
    for (let i = 0; i < nullDetailMovies.length; i += BATCH_SIZE) {
      batches.push(nullDetailMovies.slice(i, i + BATCH_SIZE));
    }

    logger.info(`共分为 ${batches.length} 批次，每批 ${BATCH_SIZE} 个请求`);

    // 逐批处理
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.info(
        `开始处理第 ${i + 1}/${batches.length} 批次，共 ${batch.length} 部影片`
      );

      // 并发执行当前批次的所有请求
      await Promise.all(
        batch.map(async (movie: { number: string; id: any; }) => {
          try {
            const movieDetail = await getMovieDetail(movie.number);
            const magnets: Magnet[] = await getMovieMagnets({
              movieId: id,
              gid: movieDetail.gid!,
              uc: movieDetail.uc!,
              sortBy: 'date',
              sortOrder: 'desc'
            });
            await prisma.movie.update({
              where: { id: movie.id },
              data: {
                detail: movieDetail as unknown as Prisma.InputJsonValue,
                cover: movieDetail.img,
                magnets:magnets
              }
            });
            logger.info(`✓ ${movie.number} 详情获取成功`);
          } catch (error) {
            logger.error(`✗ ${movie.number} 详情获取失败: ${error}`);
          }
        })
      );

      logger.info(`第 ${i + 1} 批次完成`);

      // 如果不是最后一批，延迟后继续
      if (i < batches.length - 1) {
        logger.info(`等待 ${DELAY_MS}ms 后继续...`);
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    logger.info(`所有影片详情获取完成`);
    return NextResponse.json(
      { success: true, processed: nullDetailMovies.length },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching movie detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movie detail' },
      { status: 500 }
    );
  }
}
