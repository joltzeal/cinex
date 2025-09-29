import { db } from "@/lib/db";
import { getMovieDetail, getMovieMagnets } from "@/lib/javbus-parser";
import { MovieDetail, Magnet } from "@/types/javbus";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from '@prisma/client';

export async function GET(
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

    if (movie?.detail) {
      console.log(`[CACHE HIT] Serving detail and magnets for movie ID: ${id} from DB.`);
      
      const cachedData: MovieDetail & { magnets: Magnet[] } = {
        ...(movie.detail as unknown as MovieDetail),
        magnets: movie.magnets as unknown as Magnet[],
      };
      
      return NextResponse.json({ data: cachedData }, { status: 200 });
    }

    console.log(`[CACHE MISS] Fetching detail and magnets for movie ID: ${id} from source.`);
    
    const movieDetail: MovieDetail = await getMovieDetail(id);
    
    const magnets: Magnet[] = await getMovieMagnets({
      movieId: id,
      gid: movieDetail.gid!,
      uc: movieDetail.uc!,
      sortBy: 'date',
      sortOrder: 'desc'
    });

    const updatedData: MovieDetail & { magnets: Magnet[] } = {
      ...movieDetail,
      magnets: magnets
    };
    
    const serializableDetail = JSON.parse(JSON.stringify(movieDetail));

    if (movie) {
      console.log(`[DB UPDATE] Updating detail and magnets for movie ID: ${id}`);
      await db.subscribeData.update({
        where: {
          id: movie.id
        },
        data: {
          cover: movieDetail.img,
          detail: serializableDetail,
          magnets: magnets as unknown as Prisma.InputJsonValue
        }
      });
    }

    return NextResponse.json({
      data: updatedData
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching movie detail:', error);
    if (error instanceof Error && error.message.includes('404')) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to fetch movie detail" }, { status: 500 });
  }
}