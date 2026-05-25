import { NextRequest, NextResponse } from 'next/server';

import { getSubscribeMovieList } from '@/services/subscribe';

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 100;

function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const skip = parsePositiveInteger(searchParams.get('skip'), 0);
  const requestedTake = parsePositiveInteger(
    searchParams.get('take'),
    DEFAULT_PAGE_SIZE
  );
  const take = Math.min(requestedTake, MAX_PAGE_SIZE);

  const movies = await getSubscribeMovieList({
    orderBy: {
      date: 'desc'
    },
    skip,
    take: take + 1
  });
  const hasMore = movies.length > take;

  return NextResponse.json({
    success: true,
    data: movies.slice(0, take),
    hasMore
  });
}
