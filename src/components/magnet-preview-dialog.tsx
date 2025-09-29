"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { toast } from "sonner";
import { Copy, Eye, File as FileIcon, Folder, HardDrive, Image as ImageIcon, Loader2 } from "lucide-react";

import { PreviewResponse } from "@/lib/magnet/link-preview";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "./ui/scroll-area";

// ... formatBytes function remains the same ...
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

export function MagnetPreviewDialog({ magnetLink, open, onOpenChange }: MagnetPreviewDialogProps) {
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
            throw new Error(data.error || "Failed to fetch preview.");
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

  const screenshots = previewData?.screenshots?.map(ss => ({ src: ss.screenshot })) || [];

  const handleCopy = () => {
    if (magnetLink) {
        navigator.clipboard.writeText(magnetLink);
        toast.success("磁力链接已复制");
    }
  }

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
        <DialogContent 
          className="sm:max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle className="break-all">{previewData?.name || "Loading Preview..."}</DialogTitle>
            <DialogDescription>
                <div className="flex items-start text-xs text-muted-foreground mt-2 cursor-pointer" onClick={handleCopy}>
                    <Copy className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                    <span className="break-all line-clamp-2">{magnetLink}</span>
                </div>
            </DialogDescription>
          </DialogHeader>
          
          <div className="min-h-[200px] flex items-center justify-center">
            {isLoading && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
            {error && <div className="text-red-500 text-center p-4">{error}</div>}
            {previewData && (
              <div className="w-full space-y-4">
                <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary"><HardDrive className="h-3 w-3 mr-1.5"/>{formatBytes(previewData.size)}</Badge>
                    <Badge variant="secondary">{previewData.type === 'FOLDER' ? <Folder className="h-3 w-3 mr-1.5"/> : <FileIcon className="h-3 w-3 mr-1.5"/>}{previewData.count} {previewData.type === 'FOLDER' ? 'files' : 'file'}</Badge>
                    <Badge variant="secondary"><ImageIcon className="h-3 w-3 mr-1.5"/>{previewData.file_type}</Badge>
                </div>

                {screenshots.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">Screenshots</h4>
                    <ScrollArea className="h-72 w-full">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pr-4">
                        {screenshots.map((ss, index) => (
                            <div key={index} className="relative aspect-video overflow-hidden rounded-md cursor-pointer group" onClick={handleImageClick}>
                            <Image src={ss.src} alt={`Screenshot ${index + 1}`} fill className="object-cover transition-transform duration-300 group-hover:scale-110"/>
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

      <Lightbox
        open={lightboxOpen}
        close={handleLightboxClose}
        slides={screenshots}
        carousel={{
          finite: true,
        }}
        controller={{
          closeOnBackdropClick: true,
          closeOnPullDown: true,
        }}
        render={{
          buttonPrev: screenshots.length <= 1 ? () => null : undefined,
          buttonNext: screenshots.length <= 1 ? () => null : undefined,
        }}
      />
    </>
  );
}