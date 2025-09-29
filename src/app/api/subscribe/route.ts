import { NextRequest, NextResponse } from "next/server";
import { db } from '@/lib/db';
import { getMoviesByPage, getStarInfo } from "@/lib/javbus-parser";
import { FilterType, GetMoviesQuery, MagnetType, Movie, MoviesPage, MovieType, Pagination, StarInfo } from "@/types/javbus";
import { sleep } from "@/lib/utils";
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

  const segments = pathname.split('/').filter(seg => seg !== '');

  if (segments.length < 2) return null;

  const [type, value] = segments;
  const allowedTypes: FilterType[] = ['star', 'genre', 'director', 'studio', 'label', 'series'];

  if (allowedTypes.includes(type as FilterType)) {
    return { filterType: type as FilterType, filterValue: value };
  }

  return null;
}


// 添加新订阅
export async function POST(request: NextRequest) {
  try {
    // 1. 解析请求参数
    const body = await request.json().catch(() => ({}));
    const url = body.url.trim();
    // const delayMs = typeof body?.delayMs === "number" && body.delayMs >= 0 ? body.delayMs : 1000;
    // const userMaxPages = typeof body?.maxPages === "number" && body.maxPages > 0 ? body.maxPages : 200;

    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }
    const filter = extractFilter(url);
    if (!filter) {
      return NextResponse.json({ error: "can't extract filter from url" }, { status: 400 });
    }
    const { filterType, filterValue } = filter;

    // 2. 检查订阅是否存在
    const existingSubscribe = await db.subscribeJAVBus.findFirst({
      where: { filterType, filterValue },
    });

    if (existingSubscribe) {
      return NextResponse.json({ error: "该订阅源已经存在" }, { status: 400 });
    }

    const allMovies: Movie[] = [];
    let currentPage = 1;
    let fetchedPages = 0;
    let savedFilter = null;
    const FULL_UPDATE_PAGE_LIMIT = 100; // 全量更新的硬性页数限制

    while (true) {
      fetchedPages++;
      // 应用硬性限制和用户自定义限制中较小的一个
      if (fetchedPages > Math.min(FULL_UPDATE_PAGE_LIMIT, parseInt(process.env.DEFAULT_SUBSCRIBE_MAX_PAGES || '30'))) {
          // console.log(`[JAVBUS FULL] Reached page limit (${Math.min(FULL_UPDATE_PAGE_LIMIT, userMaxPages)}). Stopping.`);
          break;
      }

      const pageResult = await getMoviesByPage({
        page: String(currentPage),
        type: "normal", magnet: "exist", filterType, filterValue,
      });

      if (Array.isArray(pageResult.movies)) allMovies.push(...pageResult.movies);
      if (!savedFilter && (pageResult as any).filter) savedFilter = (pageResult as any).filter;

      if (!pageResult.pagination?.hasNextPage) break;
      currentPage = pageResult.pagination.nextPage ?? currentPage + 1;
      await sleep(parseInt(process.env.DEFAULT_SUBSCRIBE_DELAY_MS || '1000'));
    }

    // 去重
    const uniqueMovies = Array.from(new Map(allMovies.map(m => [m.id, m])).values());
    console.log(`[JAVBUS FULL] Scraped ${uniqueMovies.length} unique movies.`);

    // 获取 StarInfo (如果适用)
    let starInfoToSave: StarInfo | null = null;
    if (filterType === 'star') {
      try {
        starInfoToSave = await getStarInfo(filterValue);
      } catch (err) {
        console.warn("[JAVBUS FULL] getStarInfo failed:", err);
      }
    }
    
    // 创建订阅记录
    const createdSubscribe = await db.subscribeJAVBus.create({
      data: {
        filterType,
        filterValue,
        filter: savedFilter || filter,
        starInfo: starInfoToSave,
      } as any,
    });

    // 批量插入电影数据
    const rows = uniqueMovies.map((m) => ({
      subscribeId: createdSubscribe.id,
      code: m.id ?? "", 
      title: m.title ?? "", 
      date: m.date ?? null, 
      tags: m.tags ?? [],
      status: "uncheck" as const,
      poster: m.img ?? null,
    }));

    await db.subscribeData.createMany({ data: rows, skipDuplicates: true });
      
      return NextResponse.json({
        data: {
          status: "created",
          subscribeId: createdSubscribe.id,
          totalAdded: rows.length,
          filter: savedFilter || filter,
        },
      }, { status: 201 });
    
    // =================================================================
    // 分支 A: 增量更新 (订阅已存在)
    // =================================================================
    // if (existingSubscribe) {
    //   console.log(`[JAVBUS INCREMENTAL] Starting update for: ${filterType}=${filterValue}, ID=${existingSubscribe.id}`);
      
    //   const newMovies: Movie[] = [];
    //   let stopScraping = false;
    //   let currentPage = 1;
    //   let savedFilter = null; // 用于存储从页面上抓取到的 filter 信息

    //   // 获取当前订阅的所有电影ID，用于比对
    //   const existingSourceRows = await db.subscribeData.findMany({
    //     where: { subscribeId: existingSubscribe.id },
    //     select: { sourceId: true },
    //   });
    //   const existingSourceIdSet = new Set(existingSourceRows.map((r) => r.sourceId));
    //   console.log(`[JAVBUS INCREMENTAL] Found ${existingSourceIdSet.size} existing movies in DB.`);

    //   while (!stopScraping) {
    //     if (currentPage > userMaxPages) { // 增量更新也受最大页数限制，防止意外
    //         console.log(`[JAVBUS INCREMENTAL] Reached max page limit (${userMaxPages}). Stopping.`);
    //         break;
    //     }

    //     const pageResult: MoviesPage = await getMoviesByPage({
    //         page: String(currentPage),
    //         type: "normal",
    //         magnet: "exist",
    //         filterType,
    //         filterValue,
    //     });
        
    //     if (!savedFilter && (pageResult as any).filter) savedFilter = (pageResult as any).filter;

    //     if (!pageResult.movies || pageResult.movies.length === 0) {
    //         stopScraping = true;
    //         break;
    //     }

    //     // 逐条比对，一旦发现已存在的数据，就停止
    //     for (const movie of pageResult.movies) {
    //         if (existingSourceIdSet.has(movie.id)) {
    //             console.log(`[JAVBUS INCREMENTAL] Found existing movie ID: ${movie.id}. Stopping scrape.`);
    //             stopScraping = true;
    //             break; // 停止处理当前页的剩余电影
    //         }
    //         newMovies.push(movie);
    //     }

    //     if (stopScraping) break; // 跳出外层循环

    //     // 分页逻辑
    //     if (!pageResult.pagination?.hasNextPage) break;
    //     currentPage = pageResult.pagination.nextPage ?? currentPage + 1;
    //     await sleep(delayMs);
    //   }
      
      // 如果没有新电影
    //   if (newMovies.length === 0) {
    //     return NextResponse.json({
    //       data: {
    //         action: "incremental_update",
    //         status: "no_new",
    //         subscribeId: existingSubscribe.id,
    //         newlyAdded: 0,
    //         filter: savedFilter || filter,
    //       },
    //     }, { status: 200 });
    //   }

    //   // 插入新电影
    //   const newRows = newMovies.map((m) => ({
    //     subscribeId: existingSubscribe.id,
    //     sourceId: m.id ?? "", title: m.title ?? "", img: m.img ?? null,
    //     date: m.date ?? null, tags: m.tags ?? [],
    //     isDownloaded: false, status: "uncheck" as const,
    //   }));

    //   await db.subscribeData.createMany({ data: newRows, skipDuplicates: true });

    //   return NextResponse.json({
    //     data: {
    //       action: "incremental_update",
    //       status: "success",
    //       subscribeId: existingSubscribe.id,
    //       newlyAdded: newMovies.length,
    //       filter: savedFilter || filter,
    //     },
    //   }, { status: 200 });
    // }

    // =================================================================
    // 分支 B: 全量更新 (首次创建订阅)
    // =================================================================
    // else {
    //   console.log(`[JAVBUS FULL] Starting new subscription for: ${filterType}=${filterValue}`);
      
    //   const allMovies: Movie[] = [];
    //   let currentPage = 1;
    //   let fetchedPages = 0;
    //   let savedFilter = null;
    //   const FULL_UPDATE_PAGE_LIMIT = 30; // 全量更新的硬性页数限制

    //   while (true) {
    //     fetchedPages++;
    //     // 应用硬性限制和用户自定义限制中较小的一个
    //     if (fetchedPages > Math.min(FULL_UPDATE_PAGE_LIMIT, userMaxPages)) {
    //         console.log(`[JAVBUS FULL] Reached page limit (${Math.min(FULL_UPDATE_PAGE_LIMIT, userMaxPages)}). Stopping.`);
    //         break;
    //     }

    //     const pageResult = await getMoviesByPage({
    //       page: String(currentPage),
    //       type: "normal", magnet: "exist", filterType, filterValue,
    //     });

    //     if (Array.isArray(pageResult.movies)) allMovies.push(...pageResult.movies);
    //     if (!savedFilter && (pageResult as any).filter) savedFilter = (pageResult as any).filter;

    //     if (!pageResult.pagination?.hasNextPage) break;
    //     currentPage = pageResult.pagination.nextPage ?? currentPage + 1;
    //     await sleep(delayMs);
    //   }

    //   // 去重
    //   const uniqueMovies = Array.from(new Map(allMovies.map(m => [m.id, m])).values());
    //   console.log(`[JAVBUS FULL] Scraped ${uniqueMovies.length} unique movies.`);

    //   // 获取 StarInfo (如果适用)
    //   let starInfoToSave: StarInfo | null = null;
    //   if (filterType === 'star') {
    //     try {
    //       starInfoToSave = await getStarInfo(filterValue);
    //     } catch (err) {
    //       console.warn("[JAVBUS FULL] getStarInfo failed:", err);
    //     }
    //   }
      
      // 创建订阅记录
      // const createdSubscribe = await db.subscribeJAVBus.create({
      //   data: {
      //     filterType,
      //     filterValue,
      //     filter: savedFilter || filter,
      //     starInfo: starInfoToSave,
      //   } as any,
      // });

      // // 批量插入电影数据
      // const rows = uniqueMovies.map((m) => ({
      //   subscribeId: createdSubscribe.id,
      //   sourceId: m.id ?? "", title: m.title ?? "", img: m.img ?? null,
      //   date: m.date ?? null, tags: m.tags ?? [],
      //   isDownloaded: false, status: "uncheck" as const,
      // }));

      
    // }
  } catch (err: any) {
    console.error("[JAVBUS SUBSCRIBE ERROR]", err);
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}


export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const subscribeId = body.subscribeId;

    if (!subscribeId) {
      return NextResponse.json({ error: "subscribeId is required" }, { status: 400 });
    }

    // 检查订阅是否存在
    const existingSubscribe = await db.subscribeJAVBus.findUnique({
      where: { id: subscribeId },
      include: {
        movies: true
      }
    });

    if (!existingSubscribe) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    console.log(`[JAVBUS DELETE] Deleting subscription: ${subscribeId}, movies count: ${existingSubscribe.movies.length}`);

    // 删除相关的电影数据
    await db.subscribeData.deleteMany({
      where: { subscribeId }
    });

    // 删除订阅记录
    await db.subscribeJAVBus.delete({
      where: { id: subscribeId }
    });

    return NextResponse.json({
      message: "Subscription deleted successfully",
      deletedMoviesCount: existingSubscribe.movies.length
    }, { status: 200 });

  } catch (err: any) {
    console.error("[JAVBUS DELETE ERROR]", err);
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}