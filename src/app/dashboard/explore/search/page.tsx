'use client';

import { useState, useMemo } from 'react';
import { Loader2, Search, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// import { SearchResultsTabs } from '@/components/search/search-results-tabs';
// import { FilterSidebar, type Filters } from '@/components/search/filter-search-bar';
// import { MagnetPreviewDialog } from '@/components/magnet-preview-dialog';

// Import shadcn/ui components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TorrentSearchResult } from '@/lib/scrapers/interface';
import { Filters } from '@/components/search/filter-search-bar';
// import { useLoading } from '@/contexts/loading-context';

// --- Type Definitions ---
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

const SORT_OPTIONS = [
  { value: '0', label: '默认' },
  { value: '3', label: '热度' },
  { value: '1', label: '文件大小' },
  { value: '2', label: '添加日期' },
  { value: '4', label: '最后下载' }
];

// --- Animation Variants ---
const viewVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

// --- Helper Function ---
const parseSizeToMB = (sizeStr: string): number => {
  if (!sizeStr) return 0;
  const size = parseFloat(sizeStr);
  if (isNaN(size)) return 0;
  if (sizeStr.toUpperCase().includes('GB')) return size * 1024;
  if (sizeStr.toUpperCase().includes('TB')) return size * 1024 * 1024;
  if (sizeStr.toUpperCase().includes('KB')) return size / 1024;
  return size; // Assume MB
};

export default function SearchPage() {
  // --- State Management ---
  const [keyword, setKeyword] = useState<string>('');
  const [sortOption, setSortOption] = useState<string>('0');
  const [searchResults, setSearchResults] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // const { showLoader, hideLoader, updateLoadingMessage } = useLoading();
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [previewingMagnet, setPreviewingMagnet] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    sources: [],
    minSize: null,
    maxSize: null,
    minFiles: null,
    maxFiles: null
  });

  // --- Handlers ---
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    // showLoader(`正在搜索  "${keyword}"  相关的磁力链接 ...`);
    setIsLoading(true);

    setError(null);
    setSearchResults(null);

    try {
      const url = `/api/download/torrents/search/${encodeURIComponent(keyword)}?sort=${sortOption}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Error: ${response.statusText}`);
      const data: ApiResponse = await response.json();
      setSearchResults(data);
      // 🔥 Transition to results view upon successful search
      setHasSearched(true);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch search results.');
      // Also transition to show the error in the results view
      setHasSearched(true);
    } finally {
      // hideLoader();
      setIsLoading(false);
    }
  };

  const handleNewSearch = () => {
    setHasSearched(false);
    // Optionally reset search results after animation out
    setTimeout(() => {
      setSearchResults(null);
      setError(null);
    }, 300); // Corresponds with animation duration
  };

  // --- Memoized Filtering Logic ---
  const filteredData = useMemo(() => {
    if (!searchResults?.data) return {};
    const filtered: ApiResponse['data'] = {};
    for (const source in searchResults.data) {
      if (!filters.sources.includes(source)) continue;
      const sourceData = searchResults.data[source];
      const filteredList = sourceData.list.filter((item) => {
        const itemSizeMB = parseSizeToMB(item.size);
        if (filters.minSize != null && itemSizeMB < filters.minSize)
          return false;
        if (filters.maxSize != null && itemSizeMB > filters.maxSize)
          return false;
        const fileCount = item.fileList
          ? parseInt(item.fileList.length.toString(), 10)
          : 0;
        if (!isNaN(fileCount)) {
          if (filters.minFiles != null && fileCount < filters.minFiles)
            return false;
          if (filters.maxFiles != null && fileCount > filters.maxFiles)
            return false;
        }
        return true;
      });
      if (filteredList.length > 0) {
        filtered[source] = { count: filteredList.length, list: filteredList };
      }
    }
    return filtered;
  }, [searchResults, filters]);

  // --- Render Logic ---
  return (
    <div className='relative min-h-[calc(100vh-8rem)]'>
      {/* 🔥 AnimatePresence manages the transition between the two views */}
      <AnimatePresence mode='wait'>
        {!hasSearched ? (
          // --- VIEW 1: SEARCH FORM ---
          <motion.div
            key='search-view'
            variants={viewVariants}
            initial='hidden'
            animate='visible'
            exit='exit'
            transition={{ duration: 0.3 }}
            className='container mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center p-4 md:p-8'
          >
            <Card className='w-full'>
              <CardHeader>
                <CardTitle className='text-center text-2xl font-bold'>
                  资源搜索
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className='space-y-6'>
                  <div className='flex w-full items-center space-x-2'>
                    <Input
                      type='search'
                      placeholder='输入关键词搜索磁力链接'
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      className='p-6 text-lg'
                    />
                    <Button type='submit' size='lg' disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className='h-5 w-5 animate-spin' />
                      ) : (
                        <Search className='h-5 w-5' />
                      )}
                    </Button>
                  </div>
                  <RadioGroup
                    value={sortOption}
                    onValueChange={setSortOption}
                    className='flex flex-wrap justify-center gap-4 pt-2'
                  >
                    {SORT_OPTIONS.map((option) => (
                      <div
                        key={option.value}
                        className='flex items-center space-x-2'
                      >
                        <RadioGroupItem
                          value={option.value}
                          id={`sort-${option.value}`}
                        />
                        <Label htmlFor={`sort-${option.value}`}>
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          // --- VIEW 2: SEARCH RESULTS ---
          <motion.div
            key='results-view'
            variants={viewVariants}
            initial='hidden'
            animate='visible'
            exit='exit'
            transition={{ duration: 0.3 }}
            className='container mx-auto h-full px-4 py-8 md:px-8' // Full width with padding
          >
            {error && (
              <div className='rounded-md bg-red-100 p-8 text-center text-red-500 dark:bg-red-900/20'>
                <p>
                  <strong>An error occurred:</strong> {error}
                </p>
              </div>
            )}

            {searchResults && !error && (
              <div className='grid grid-cols-1 lg:grid-cols-4 lg:gap-8'>
                <main className='lg:col-span-3'>
                  {/* <SearchResultsTabs
                    data={filteredData}
                    onPreviewMagnet={setPreviewingMagnet}
                  /> */}
                </main>
                <aside className='mt-8 lg:col-span-1 lg:mt-0'>
                  <div className='mb-6 flex items-center'>
                    <Button
                      onClick={handleNewSearch}
                      variant='outline'
                      size='sm'
                    >
                      <ArrowLeft className='mr-2 h-4 w-4' />
                      重新搜索
                    </Button>
                  </div>
                  {/* <FilterSidebar
                    allData={searchResults.data}
                    onFilterChange={setFilters}
                  /> */}
                </aside>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Loading Overlay */}
      {/* {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )} */}

      {/* Magnet Preview Dialog remains unchanged */}
      {/* <MagnetPreviewDialog
        open={!!previewingMagnet}
        onOpenChange={(open) => !open && setPreviewingMagnet(null)}
        magnetLink={previewingMagnet || ''}
      /> */}
    </div>
  );
}
