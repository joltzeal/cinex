'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Copy,
  File as FileIcon,
  Folder,
  HardDrive,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';

import { PreviewResponse } from '@/lib/magnet/link-preview';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

interface MagnetPreviewDialogProps {
  magnetLink: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MagnetPreviewDialog({
  magnetLink,
  open,
  onOpenChange
}: MagnetPreviewDialogProps) {
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (magnetLink && open) {
      const fetchPreview = async () => {
        setIsLoading(true);
        setError(null);
        setPreviewData(null);
        try {
          const apiUrl = `/api/download/torrents/preview?magnet=${encodeURIComponent(magnetLink)}`;
          const response = await fetch(apiUrl);
          const data = await response.json();
          if (!response.ok || data.error) {
            throw new Error(data.error || 'Failed to fetch preview.');
          }
          setPreviewData(data);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchPreview();
    }
  }, [magnetLink, open]);

  useEffect(() => {
    if (!api) return;
    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const screenshots =
    previewData?.screenshots?.map((ss) => ({ src: ss.screenshot })) || [];

  const handleCopy = () => {
    if (magnetLink) {
      navigator.clipboard.writeText(magnetLink);
      toast.success('磁力链接已复制');
    }
  };

  const handleThumbnailClick = (index: number) => {
    api?.scrollTo(index);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-3xl max-h-[90vh]'>
          <DialogHeader>
            <DialogTitle className='break-all'>
              {previewData?.name || 'Loading Preview...'}
            </DialogTitle>
            <DialogDescription asChild>
              <div
                className='text-muted-foreground mt-2 flex cursor-pointer items-start text-xs'
                onClick={handleCopy}
              >
                <Copy className='mt-0.5 mr-1 h-3 w-3 shrink-0' />
                <span className='line-clamp-2 break-all'>{magnetLink}</span>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className='flex min-h-50 items-center justify-center'>
            {isLoading && (
              <Loader2 className='text-primary h-8 w-8 animate-spin' />
            )}
            {error && (
              <div className='p-4 text-center text-red-500'>{error}</div>
            )}
            {previewData && (
              <div className='w-full space-y-4'>
                <div className='flex flex-wrap gap-2'>
                  <Badge variant='secondary'>
                    <HardDrive className='mr-1.5 h-3 w-3' />
                    {formatBytes(previewData.size)}
                  </Badge>
                  <Badge variant='secondary'>
                    {previewData.type === 'FOLDER' ? (
                      <Folder className='mr-1.5 h-3 w-3' />
                    ) : (
                      <FileIcon className='mr-1.5 h-3 w-3' />
                    )}
                    {previewData.count}{' '}
                    {previewData.type === 'FOLDER' ? 'files' : 'file'}
                  </Badge>
                  <Badge variant='secondary'>
                    <ImageIcon className='mr-1.5 h-3 w-3' />
                    {previewData.file_type}
                  </Badge>
                </div>

                {screenshots.length > 0 && (
                  <div className='space-y-3'>
                    <h4 className='text-sm font-semibold'>Screenshots</h4>
                    <Carousel setApi={setApi} className='w-full'>
                      <CarouselContent>
                        {screenshots.map((ss, index) => (
                          <CarouselItem key={index}>
                            <div className='flex items-center justify-center rounded-lg overflow-hidden bg-muted'>
                              <img
                                src={ss.src}
                                alt={`Screenshot ${index + 1}`}
                                className='max-h-[50vh] w-full object-contain'
                              />
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      {screenshots.length > 1 && (
                        <>
                          <CarouselPrevious className='left-2' />
                          <CarouselNext className='right-2' />
                        </>
                      )}
                    </Carousel>
                    {screenshots.length > 1 && (
                      <div className='flex gap-2 overflow-x-auto py-2'>
                        {screenshots.map((ss, index) => (
                          <button
                            key={index}
                            onClick={() => handleThumbnailClick(index)}
                            className={cn(
                              'relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-all',
                              current === index
                                ? 'border-primary ring-2 ring-primary/20'
                                : 'border-transparent hover:border-muted-foreground/30'
                            )}
                          >
                            <img
                              src={ss.src}
                              alt={`Thumbnail ${index + 1}`}
                              className='h-full w-full object-cover'
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
  );
}
