'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { MovieDetailDialogLayout } from './subscribe-detail';
import { MovieDetail } from '@/types/javbus';

interface MovieDetailDialogProps {
  movieData: MovieDetail | null;
  children: React.ReactNode;
  autoOpen?: boolean;
  onClose?: () => void;
}

export function MovieDetailDialog({ 
  movieData, 
  children, 
  autoOpen = false,
  onClose
}: MovieDetailDialogProps) {
  const [isOpen, setIsOpen] = useState(autoOpen);

  // 当autoOpen为true且有movieData时，自动打开弹窗
  useEffect(() => {
    if (autoOpen && movieData && !isOpen) {
      setIsOpen(true);
    }
  }, [autoOpen, movieData, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open && onClose) {
        onClose();
      }
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">电影详情</DialogTitle>
        
        {/* 数据加载成功后，渲染布局组件 */}
        {movieData && (
          <MovieDetailDialogLayout movie={movieData} showSubscribeButton={false} />
        )}
      </DialogContent>
    </Dialog>
  );
}
