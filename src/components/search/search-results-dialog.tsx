'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { MagnetPreviewDialog } from '@/components/magnet-preview-dialog';
import { SearchResultsTabs } from '@/components/search/search-results-tabs';
import { TorrentSearchResult } from '@/lib/scrapers/interface';

interface SourceData {
  count: number;
  list: TorrentSearchResult[];
}

interface ApiResponse {
  query: {
    keyword: string;
    sort: string;
  };
  data: {
    [source: string]: SourceData;
  };
}

interface SearchResultsDialogProps {
  searchResults: ApiResponse | null;
  isLoading: boolean;
  error: string | null;
  children: React.ReactNode;
  autoOpen?: boolean;
  onClose?: () => void;
}

export function SearchResultsDialog({
  searchResults,
  isLoading,
  error,
  children,
  autoOpen = false,
  onClose
}: SearchResultsDialogProps) {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [previewingMagnet, setPreviewingMagnet] = useState<string | null>(null);

  // 当有搜索结果时自动打开弹窗
  useEffect(() => {
    if (autoOpen && searchResults && !isLoading) {
      setIsOpen(true);
    }
  }, [autoOpen, searchResults, isLoading]);

  return (
    <>
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
          <DialogTitle>搜索结果</DialogTitle>

          {isLoading && (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">正在搜索中...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center text-destructive">
              <h3 className="text-lg font-semibold">搜索失败</h3>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {searchResults && !isLoading && (
            <SearchResultsTabs
              data={searchResults.data}
              onPreviewMagnet={setPreviewingMagnet}
            />
          )}
        </DialogContent>
      </Dialog>

      <MagnetPreviewDialog
        open={!!previewingMagnet}
        onOpenChange={(open) => !open && setPreviewingMagnet(null)}
        magnetLink={previewingMagnet || ''}
      />
    </>
  );
}
