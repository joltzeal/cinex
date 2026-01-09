import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  const { number } = await params;
  const movie = await db.movie.findFirst({
    where: { number: number }
  });
  return NextResponse.json({ data: movie });
}
