'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  Copy,
  Eye,
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
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [lightboxOpen, setLightboxOpen] = useState(false);

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

  const screenshots =
    previewData?.screenshots?.map((ss) => ({ src: ss.screenshot })) || [];

  const handleCopy = () => {
    if (magnetLink) {
      navigator.clipboard.writeText(magnetLink);
      toast.success('磁力链接已复制');
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxOpen(true);
  };

  const handleLightboxClose = () => {
    setLightboxOpen(false);
  };

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      // 如果 lightbox 是打开的，先关闭 lightbox
      if (lightboxOpen) {
        setLightboxOpen(false);
        return;
      }
      onOpenChange(false);
    } else {
      onOpenChange(true);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle className='break-all'>
              {previewData?.name || 'Loading Preview...'}
            </DialogTitle>
            <DialogDescription>
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
                  <div>
                    <h4 className='mb-2 text-sm font-semibold'>Screenshots</h4>
                    <ScrollArea className='h-72 w-full'>
                      <div className='grid grid-cols-2 gap-2 pr-4 md:grid-cols-3'>
                        {screenshots.map((ss, index) => (
                          <div
                            key={index}
                            className='group relative aspect-video cursor-pointer overflow-hidden rounded-md'
                            onClick={handleImageClick}
                          >
                            <Image
                              src={ss.src}
                              alt={`Screenshot ${index + 1}`}
                              fill
                              className='object-cover transition-transform duration-300 group-hover:scale-110'
                            />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
