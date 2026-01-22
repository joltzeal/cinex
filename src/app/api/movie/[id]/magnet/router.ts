import { prisma } from '@/lib/prisma';
import { getMovieDetail, getMovieMagnets, getPoster } from '@/lib/javbus/javbus-parser';
import { MovieDetail, Magnet } from '@/types/javbus';
import { NextRequest, NextResponse } from 'next/server';
import { MovieStatus, Prisma } from '@prisma/client';
import { findMediaItemByIdOrTitle, getMediaLibraryCache, refreshMediaLibraryCache } from '@/lib/tasks/media-library';
import { logger } from '@/lib/logger';
import { HTTPError } from 'got';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const number = (await params).id.toUpperCase();
  
}