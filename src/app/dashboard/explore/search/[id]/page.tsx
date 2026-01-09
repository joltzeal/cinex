'use client';
import MovieDetailDisplay from '@/components/search/movie-detail';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Movie } from '@prisma/client';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import 'yet-another-react-lightbox/styles.css';

// 加载状态组件
const LoadingState = () => (
  <div className='flex h-[calc(100dvh-150px)] flex-col items-center justify-center'>
    <Loader2 className='text-primary h-12 w-12 animate-spin' />
    <p className='text-muted-foreground mt-4'>正在加载影片信息...</p>
  </div>
);

// 错误或无数据提示组件
const MessageState = ({
  title,
  message
}: {
  title: string;
  message: string;
}) => (
  <div className='flex h-[calc(100dvh-150px)] items-center justify-center p-4'>
    <Alert variant='destructive' className='max-w-md'>
      <AlertCircle className='h-4 w-4' />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  </div>
);
export default function SearchMovieResult() {
  const params = useParams();
  const id = params.id as string;

  const [movie, setMovie] = useState<Movie | null>(null);
  // 2. 本地状态只保留加载和错误，因为数据源是全局 Store
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchMovieData = async () => {
    console.log(`SearchPage: Fetching data for ID: ${id}...`);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/movie/${id}`);
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);

      const result = await response.json();
      if (!result || !result.data) throw new Error('Movie data not found.');

      setMovie(result.data);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred while loading data.');
      setMovie(null); // Clear data on error
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchMovieData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isFetchingData = isLoading && (!movie || movie.number !== id);

  // --- 渲染逻辑变得极为简洁 ---
  if (isFetchingData) {
    return <LoadingState />;
  }

  if (error) {
    return <MessageState title='加载出错' message={error} />;
  }

  if (!movie) {
    return <MessageState title='无数据' message='无法找到对应的影片信息。' />;
  }

  return <MovieDetailDisplay movie={movie} />;
}
