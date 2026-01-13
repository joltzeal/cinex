import { findVideoFiles } from '@/lib/parse/file';
import { prisma } from '@/lib/prisma';
import { getMovieDetail, getMovieMagnets } from '@/lib/javbus/javbus-parser';
import { MovieDetail, Magnet } from '@/types/javbus';
import { NextRequest, NextResponse } from 'next/server';
import { MovieStatus, Prisma } from '@prisma/client';
import { findMediaItemByIdOrTitle } from '@/lib/tasks/media-library';
import { logger } from '@/lib/logger';
import { HTTPError } from 'got';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id.toUpperCase();
    // const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'Movie ID is required' },
        { status: 400 }
      );
    }
    // const upperId = id.toUpperCase();
    const movie = await prisma.movie.findUnique({
      where: { number: id }
    });
    
    const isAdded = findMediaItemByIdOrTitle(id);

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
        
        const createdMovie = await prisma.movie.create({
          data: {
            number: movieDetail.id,
            title: movieDetail.title,
            detail: movieDetail as unknown as Prisma.InputJsonValue,
            magnets: magnets as unknown as Prisma.InputJsonValue,
            cover: movieDetail.img,
            date: movieDetail.date,
            status: isAdded ? MovieStatus.added : MovieStatus.uncheck,
            mediaLibrary: isAdded
              ? (isAdded as unknown as Prisma.InputJsonValue)
              : undefined
          }
        });
        return NextResponse.json({ data: createdMovie }, { status: 200 });
      } else if (!movie.detail || !movie.magnets) {
        const updatedMovie = await prisma.movie.update({
          where: { number: movieDetail.id },
          data: {
            detail: movieDetail as unknown as Prisma.InputJsonValue,
            magnets: magnets as unknown as Prisma.InputJsonValue,
            cover: movieDetail.img,
            date: movieDetail.date,
            status: isAdded ? MovieStatus.added : MovieStatus.uncheck,
            mediaLibrary: isAdded
              ? (isAdded as unknown as Prisma.InputJsonValue)
              : undefined
          }
        });
        return NextResponse.json({ data: updatedMovie }, { status: 200 });
      }
    }
  } catch (error: any) {
    if (error instanceof HTTPError) {
      if (error.message.includes('404')) {
        return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
      } else if (error.message.includes('403')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.json(
        { error: '[network error] Fetch failed' },
        { status: 500 }
      );
    }
    logger.error(`Error fetching movie detail:${error}`);
    return NextResponse.json(
      { error: 'Failed to fetch movie detail' },
      { status: 500 }
    );
  }
}
