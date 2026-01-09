import { prisma } from '@/lib/prisma';
import { updateMoviesStatusByNumber } from '@/services/subscribe';
import { MovieStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: 'Movie ID is required' },
      { status: 400 }
    );
  }
  await prisma.movie.update({
    where: {
      number: id
    },
    data: {
      status: MovieStatus.uncheck
    }
  });
  return NextResponse.json({ success: true }, { status: 200 });
}
// 添加新订阅
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'Movie ID is required' },
        { status: 400 }
      );
    }
    const movie = await prisma.movie.findUnique({
      where: {
        number: id
      }
    });
    if (!movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }
    if (movie.status === MovieStatus.subscribed) {
      return NextResponse.json({ error: '该影片已订阅' }, { status: 400 });
    }
    if (movie.status === MovieStatus.downloaded) {
      return NextResponse.json({ error: '影片已下载' }, { status: 400 });
    } else if (movie.status === MovieStatus.added) {
      return NextResponse.json(
        { error: '影片已添加到媒体库中' },
        { status: 400 }
      );
    } else if (movie.status === MovieStatus.downloading) {
      return NextResponse.json({ error: '影片正在下载' }, { status: 400 });
    }
    await prisma.movie.update({
      where: {
        number: id
      },
      data: {
        status: MovieStatus.subscribed,
        subscribeAt: new Date()
      }
    });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error fetching movie detail:', error);
    if (error instanceof Error && error.message.includes('404')) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch movie detail' },
      { status: 500 }
    );
  }
}
