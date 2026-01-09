'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ImagePreviewItem {
  src: string;
  alt?: string;
  title?: string;
}

interface ImagePreviewDialogProps {
  images: ImagePreviewItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialIndex?: number;
  title?: string;
  showDownload?: boolean;
  onDownload?: (image: ImagePreviewItem, index: number) => void;
}

export function ImagePreviewDialog({
  images,
  open,
  onOpenChange,
  initialIndex = 0,
  title = 'Image Preview',
  showDownload = false,
  onDownload
}: ImagePreviewDialogProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(initialIndex);

  // 当 Dialog 打开或 initialIndex 变化时，更新当前索引和滚动位置
  useEffect(() => {
    if (open && api) {
      setCurrent(initialIndex);
      api.scrollTo(initialIndex, true);
    }
  }, [open, initialIndex, api]);

  // 监听 carousel 变化
  useEffect(() => {
    if (!api) return;

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const handleDownload = () => {
    if (onDownload && images[current]) {
      onDownload(images[current], current);
    } else if (images[current]) {
      // 默认下载行为
      const link = document.createElement('a');
      link.href = images[current].src;
      link.download = images[current].title || `image-${current + 1}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleThumbnailClick = (index: number) => {
    api?.scrollTo(index);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[90vh] min-w-[70vw] flex-col gap-0 p-0'>
        <DialogHeader className='shrink-0 border-b px-6 pt-6 pb-4'>
          <DialogTitle className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <span>{title}</span>
            </div>
            <span className='text-muted-foreground text-sm font-normal'>
              {images[current]?.title || `${current + 1} of ${images.length}`}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Main Carousel - 占据剩余空间 */}
        <div className='flex-1 overflow-hidden px-6 py-4'>
          <Carousel setApi={setApi} className='h-full w-full'>
            <CarouselContent className='h-full items-center'>
              {images.map((image, index) => (
                <CarouselItem
                  key={index}
                  className='flex items-center justify-center'
                >
                  <div className='flex max-h-full items-center justify-center overflow-hidden rounded-lg'>
                    <img
                      src={image.src}
                      alt={image.alt || `Image ${index + 1}`}
                      className={cn(
                        'max-w-full object-contain',
                        showDownload
                          ? 'max-h-[calc(90vh-280px)]'
                          : 'max-h-[calc(90vh-200px)]'
                      )}
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {images.length > 1 && (
              <>
                <CarouselPrevious className='left-2' />
                <CarouselNext className='right-2' />
              </>
            )}
          </Carousel>
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className='shrink-0 px-6 pb-4'>
            <div className='scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent flex justify-start gap-2 overflow-x-auto py-2'>
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => handleThumbnailClick(index)}
                  className={cn(
                    'relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-all',
                    current === index
                      ? 'border-primary ring-primary/20 ring-2'
                      : 'hover:border-muted-foreground/30 border-transparent'
                  )}
                >
                  <img
                    src={image.src}
                    alt={image.alt || `Thumbnail ${index + 1}`}
                    className='h-full w-full object-cover'
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Download Button */}
        {showDownload && (
          <div className='shrink-0 border-t px-6 pt-2 pb-6'>
            <Button
              variant='outline'
              className='w-full'
              onClick={handleDownload}
            >
              <Download className='mr-2 h-4 w-4' />
              Download
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Hook for easier usage
export function useImagePreview() {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<ImagePreviewItem[]>([]);
  const [initialIndex, setInitialIndex] = useState(0);

  const openPreview = (imageList: ImagePreviewItem[], startIndex = 0) => {
    setImages(imageList);
    setInitialIndex(startIndex);
    setOpen(true);
  };

  const closePreview = () => {
    setOpen(false);
  };

  return {
    open,
    images,
    initialIndex,
    openPreview,
    closePreview,
    setOpen
  };
}
