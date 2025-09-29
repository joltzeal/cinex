// [你的路由文件路径]
import { db } from "@/lib/db";
import { getMovieDetail, getMovieMagnets } from "@/lib/javbus-parser";
import { MovieDetail, Magnet } from "@/types/javbus";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Movie ID is required" }, { status: 400 });
    }

    const movie = await db.subscribeData.findFirst({
      where: {
        code: id
      }
    });
    if (movie) {
      if (movie.status === 'subscribed') {
        return NextResponse.json({ error: "影片已订阅" }, { status: 400 });
      } else if (movie.status === 'downloaded') {
        return NextResponse.json({ error: "影片已下载" }, { status: 400 });
      } else if (movie.status === 'added') {
        return NextResponse.json({ error: "影片已添加到媒体库中" }, { status: 400 });
      } else if (movie.status === 'downloading') {
        return NextResponse.json({ error: "影片正在下载" }, { status: 400 });
      } else {
        // 先查看是否有detail，cover
        if (!movie.detail || !movie.cover) {
          const movieDetail: MovieDetail = await getMovieDetail(id);
          const magnets: Magnet[] = await getMovieMagnets({
            movieId: id,
            gid: movieDetail.gid!,
            uc: movieDetail.uc!,
            sortBy: 'date',
            sortOrder: 'desc'
          });
          await db.subscribeData.update({
            where: {
              id: movie.id
            },
            data: {
              detail: JSON.parse(JSON.stringify(movieDetail)),
              cover: movieDetail.img,
              magnets: JSON.parse(JSON.stringify(magnets))
            }
          });
        }
        await db.subscribeData.update({
          where: {
            id: movie.id
          },
          data: {
            status: 'subscribed'
          }
        });
        return NextResponse.json({ success: true }, { status: 200 });
      }
    } else {
      const movieDetail: MovieDetail = await getMovieDetail(id);
      // 获取磁力链接
      const magnets: Magnet[] = await getMovieMagnets({
        movieId: id,
        gid: movieDetail.gid!,
        uc: movieDetail.uc!,
        sortBy: 'date',
        sortOrder: 'desc'
      });

      
      const serializableDetail = JSON.parse(JSON.stringify(movieDetail));
      const serializableMagnets = JSON.parse(JSON.stringify(magnets));
      await db.subscribeData.create({
        data: {
          code: movieDetail.id,
          tags:[],
          title: movieDetail.title,
          cover: movieDetail.img,
          date: movieDetail.date,
          status: 'subscribed',
          magnets: serializableMagnets,
          detail: serializableDetail,
        }
      });
      return NextResponse.json({ success: true }, { status: 200 });
    }
  } catch (error) {
    console.error('Error fetching movie detail:', error);
    if (error instanceof Error && error.message.includes('404')) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to fetch movie detail" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Movie ID is required" }, { status: 400 });
  }
  const movieId = await db.subscribeData.findMany({
    where: {
      code: id
    },
    select: {
      id: true
    }
  });
  const subscribeDataIds = movieId.map(item => item.id);
  await db.subscribeData.updateMany({
    where: {
      id: { in: subscribeDataIds }
    },
    data: {
      status: 'uncheck'
    }
  });
  return NextResponse.json({ success: true }, { status: 200 });
}