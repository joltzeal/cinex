'use client';

import {
  Dialog,
  DialogContent,
  DialogTitle
} from '@/components/ui/dialog';
import { Movie } from '@prisma/client';
import MovieDetail from './movie';

interface SimpleMovieDetailDialogProps {
  movie: Movie | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 简化版的电影详情 Dialog
 * 直接接收 movie 数据，不进行数据获取
 * 适用于已经获取到数据的场景
 */
export function SimpleMovieDetailDialog({
  movie,
  open,
  onOpenChange
}: SimpleMovieDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle className='sr-only'>电影详情</DialogTitle>
      <DialogContent className='min-w-[90vw] border-none bg-none p-0'>
        {movie && <MovieDetail movie={movie} />}
      </DialogContent>
    </Dialog>
  );
}
