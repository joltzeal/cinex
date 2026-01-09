import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

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
    const { rating, comment, tags } = await req.json();
    const movie = await prisma.movie.findUnique({
      where: { number: id }
    });
    if (!movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }
    await prisma.movie.update({
      where: { number: id },
      data: {
        rating: rating.toString(),
        comment,
        tags: tags as unknown as Prisma.InputJsonValue
      }
    });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error(`提交评价失败:${error}`);
    return NextResponse.json(
      { error: 'An internal server error occurred' },
      { status: 500 }
    );
  }
}
