import { getMovieDetail, getMovieMagnets } from "@/lib/javbus-parser";
import { NextRequest, NextResponse } from "next/server";
import { db } from '@/lib/db';
import { MovieDetail } from '@/types/javbus';
import { SortBy, SortOrder } from '@/types/javbus';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Movie ID is required" }, { status: 400 });
    }
    const movieDetail:MovieDetail = await getMovieDetail(id)
    if (!movieDetail) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }
    const magnets = await getMovieMagnets({ movieId: id, gid: movieDetail.gid!, uc: movieDetail.uc!, sortBy:'date', sortOrder: 'desc' });

    console.log(magnets);
    
    return NextResponse.json({ data: magnets }, { status: 200 });
  } catch (error) {
    console.error('Error fetching movie detail:', error);
    return NextResponse.json({ error: "Failed to fetch movie detail" }, { status: 500 });
  }
}