import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCover, getMoviesByPage, getStarInfo } from '@/lib/javbus/javbus-parser';
import { FilterType, Movie, StarInfo } from '@/types/javbus';
import { sleep } from '@/lib/utils';
import { getExistingSubscribe } from '@/services/subscribe';
import { MovieStatus } from '@prisma/client';

interface Result {
  filterType: FilterType;
  filterValue: string;
}

function extractFilter(urlStr: string): Result | null {
  let pathname: string;

  try {
    const url = new URL(urlStr);
    pathname = url.pathname;
  } catch {
    // 如果无法构造 URL，当作纯路径处理：直接使用字符串本身
    pathname = urlStr.split('?')[0].split('#')[0]; // 只取 before query/hash
  }

  const segments = pathname.split('/').filter((seg) => seg !== '');

  if (segments.length < 2) return null;

  const [type, value] = segments;
  const allowedTypes: FilterType[] = [
    'star',
    'genre',
    'director',
    'studio',
    'label',
    'series'
  ];

  if (allowedTypes.includes(type as FilterType)) {
    return { filterType: type as FilterType, filterValue: value };
  }

  return null;
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const subscribeId = body.subscribeId;

    if (!subscribeId) {
      return NextResponse.json(
        { error: 'subscribeId is required' },
        { status: 400 }
      );
    }

    // 检查订阅是否存在
    const existingSubscribe = await prisma.subscribe.findUnique({
      where: { id: subscribeId },
      include: {
        movies: true
      }
    });

    if (!existingSubscribe) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    console.log(
      `[JAVBUS DELETE] Deleting subscription: ${subscribeId}, movies count: ${existingSubscribe.movies.length}`
    );

    // 删除订阅记录（会自动删除 SubscribeMovie 中间表记录，因为有 CASCADE）
    await prisma.subscribe.delete({
      where: { id: subscribeId }
    });

    // 注意：Movie 记录不会被删除，因为可能被其他订阅共享
    // 如果需要清理孤立的 Movie 记录，可以定期运行清理任务

    return NextResponse.json(
      {
        success: 'true'
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[JAVBUS DELETE ERROR]', err);
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. 解析请求参数
    const body = await request.json().catch(() => ({}));
    const url = body.url.trim();
    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }
    const filter = extractFilter(url);
    if (!filter) {
      return NextResponse.json(
        { error: "can't extract filter from url" },
        { status: 400 }
      );
    }
    const { filterType, filterValue } = filter;

    // 2. 检查订阅是否存在
    const existingSubscribe = await getExistingSubscribe(
      filterType,
      filterValue
    );

    if (existingSubscribe) {
      return NextResponse.json({ error: '该订阅源已经存在' }, { status: 400 });
    }

    const allMovies: Movie[] = [];
    let currentPage = 1;
    let fetchedPages = 0;
    let savedFilter = null;
    const FULL_UPDATE_PAGE_LIMIT = 100; // 全量更新的硬性页数限制

    while (true) {
      fetchedPages++;
      // 应用硬性限制和用户自定义限制中较小的一个
      if (
        fetchedPages >
        Math.min(
          FULL_UPDATE_PAGE_LIMIT,
          parseInt(process.env.DEFAULT_SUBSCRIBE_MAX_PAGES || '30')
        )
      ) {
        break;
      }

      const pageResult = await getMoviesByPage({
        page: String(currentPage),
        type: 'normal',
        magnet: 'exist',
        filterType,
        filterValue
      });

      if (Array.isArray(pageResult.movies))
        allMovies.push(...pageResult.movies);
      if (!savedFilter && (pageResult as any).filter)
        savedFilter = (pageResult as any).filter;

      if (!pageResult.pagination?.hasNextPage) break;
      currentPage = pageResult.pagination.nextPage ?? currentPage + 1;
      await sleep(parseInt(process.env.DEFAULT_SUBSCRIBE_DELAY_MS || '1000'));
    }

    // 去重
    const uniqueMovies = Array.from(
      new Map(allMovies.map((m) => [m.id, m])).values()
    );

    // 如果是演员，则获取 StarInfo
    let starInfo: StarInfo | null = null;
    if (filterType === 'star') {
      try {
        starInfo = await getStarInfo(filterValue);
      } catch (err) {
        console.warn('[JAVBUS FULL] getStarInfo failed:', err);
      }
    }

    // 创建订阅记录
    const createdSubscribe = await prisma.subscribe.create({
      data: {
        filterType,
        filterValue,
        filter: savedFilter || filter,
        starInfo: starInfo
      } as any
    });

    // 处理电影数据（使用多对多关系）
    let addedCount = 0;
    for (const m of uniqueMovies) {
      try {
        // 1. 使用 upsert 确保电影的 number 唯一
        const movie = await prisma.movie.upsert({
          where: { number: m.id },
          update: {
            poster: m.img ?? null,
            cover:m.img?getCover(m.img):null,
            // 如果已存在，可以选择更新或不更新
            // 这里选择不更新，保留原有数据
          },
          create: {
            number: m.id ?? '',
            title: m.title ?? '',
            date: m.date ?? null,
            poster: m.img ?? null,
            cover:m.img?getCover(m.img):null,
            status: MovieStatus.uncheck // 设置默认状态
          }
        });

        // 2. 创建订阅关系（使用原始 SQL 避免类型问题）
        await prisma.$executeRaw`
          INSERT INTO "SubscribeMovie" ("id", "subscribeId", "movieId", "createdAt")
          VALUES (gen_random_uuid(), ${createdSubscribe.id}, ${movie.id}, CURRENT_TIMESTAMP)
          ON CONFLICT ("subscribeId", "movieId") DO NOTHING
        `;

        addedCount++;
      } catch (error) {
        console.error(`[JAVBUS] Failed to process movie ${m.id}:`, error);
      }
    }

    return NextResponse.json(
      {
        data: {
          success: 'true',
          subscribeId: createdSubscribe.id,
          totalAdded: addedCount,
          filter: savedFilter || filter
        }
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[JAVBUS SUBSCRIBE ERROR]', err);
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
