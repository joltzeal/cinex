import { db } from "@/lib/db";
import { getMovieDetail, getMovieMagnets } from "@/lib/javbus-parser";
import { MovieDetail, Magnet } from "@/types/javbus";
import { NextRequest, NextResponse } from "next/server";
import { MovieStatus, Prisma } from '@prisma/client';
import { findMediaItemByIdOrTitle } from "@/lib/tasks/media-library";
import { logger } from "@/lib/logger";


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Movie ID is required" }, { status: 400 });
    }
    const movie = await db.movie.findUnique({
      where: { number: id }
    });
    const isAdded = findMediaItemByIdOrTitle(id)
    
    if (movie && movie.detail && movie.magnets) {
      return NextResponse.json({ data: movie }, { status: 200 });
    } else {
      const movieDetail: MovieDetail = await getMovieDetail(id);
      const magnets: Magnet[] = await getMovieMagnets({
        movieId: id,
        gid: movieDetail.gid!,
        uc: movieDetail.uc!,
        sortBy: 'date',
        sortOrder: 'desc'
      });
      if (!movie) {
        const createdMovie = await db.movie.create({
          data: {
            number: id,
            title: movieDetail.title,
            detail: movieDetail as unknown as Prisma.InputJsonValue,
            magnets: magnets as unknown as Prisma.InputJsonValue,
            cover: movieDetail.img,
            date: movieDetail.date,
            status: isAdded ? MovieStatus.added : MovieStatus.uncheck,
            mediaLibrary: isAdded ? isAdded as unknown as Prisma.InputJsonValue : undefined
          }
        })
        return NextResponse.json({ data: createdMovie }, { status: 200 });
      } else if (!movie.detail || !movie.magnets) {
        logger.info(`影片 ${id} 没有详情，更新详情`);
        const updatedMovie = await db.movie.update({
          where: { number: movieDetail.id },
          data: {
            detail: movieDetail as unknown as Prisma.InputJsonValue,
            magnets: magnets as unknown as Prisma.InputJsonValue,
            cover: movieDetail.img,
            date: movieDetail.date,
            status: isAdded ? MovieStatus.added : MovieStatus.uncheck,
            mediaLibrary: isAdded ? isAdded as unknown as Prisma.InputJsonValue : undefined
          }
        })
        return NextResponse.json({ data: updatedMovie }, { status: 200 });
      }

    }

  } catch (error) {
    console.error('Error fetching movie detail:', error);
    return NextResponse.json({ error: "Failed to fetch movie detail" }, { status: 500 });
  }
}
