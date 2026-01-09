'use client';
import { GlareCard } from '@/components/ui/glare-card';
import { Badge } from '@/components/ui/badge';
import { MovieDetailDialog } from '@/components/search/movie-detail-dialog';
import { Clock, Users, Rss, PlayCircle, Film, Search } from 'lucide-react';
import { Property } from '@/types/javbus';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Movie } from '@prisma/client';
import { useMediaServer } from '@/contexts/media-server-context';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

type pageProps = {
  subscribeMovieList: Movie[];
};

type FilterType = 'rating' | 'tag' | 'keyword';

export default function LibraryPage(props: pageProps) {
  const { subscribeMovieList } = props;
  const router = useRouter();

  const mediaServer = useMediaServer();

  // 筛选状态
  const [filterType, setFilterType] = useState<FilterType>('keyword');
  const [ratingFilter, setRatingFilter] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [keywordFilter, setKeywordFilter] = useState<string>('');
  const [hasSearched, setHasSearched] = useState(false);

  // 获取所有唯一的标签
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    subscribeMovieList.forEach((movie) => {
      if (movie.tags && Array.isArray(movie.tags)) {
        (movie.tags as string[]).forEach((tag) => tagsSet.add(tag));
      }
    });
    return Array.from(tagsSet).sort();
  }, [subscribeMovieList]);

  const handlePlay = async (item: Movie) => {
    if (!mediaServer || !mediaServer.publicAddress) {
      toast.error('媒体服务器配置未设置');
      return;
    }
    if (!item.mediaLibrary) {
      toast.error('媒体信息未设置');
    }
    const mediaInfo = item.mediaLibrary as any | null;

    const ml = `${mediaServer.publicAddress}/web/index.html#!/item?id=${mediaInfo.Id}&serverId=${mediaInfo.ServerId}`;
    window.open(ml, '_blank');
  };

  // 执行搜索
  const handleSearch = () => {
    setHasSearched(true);
  };

  // 重置搜索
  const handleReset = () => {
    setRatingFilter('');
    setTagFilter('');
    setKeywordFilter('');
    setHasSearched(false);
  };

  // 根据筛选条件过滤电影列表
  const libraryMovieList = useMemo(() => {
    if (!hasSearched) {
      return subscribeMovieList.slice(0, 12);
    }

    let filtered = subscribeMovieList;

    // 根据当前筛选类型执行筛选
    if (filterType === 'rating' && ratingFilter) {
      filtered = filtered.filter((movie) => movie.rating === ratingFilter);
    } else if (filterType === 'tag' && tagFilter) {
      filtered = filtered.filter((movie) => {
        if (!movie.tags || !Array.isArray(movie.tags)) return false;
        return (movie.tags as string[]).includes(tagFilter);
      });
    } else if (filterType === 'keyword' && keywordFilter) {
      const keyword = keywordFilter.toLowerCase();
      filtered = filtered.filter((movie) => {
        return (
          movie.number?.toLowerCase().includes(keyword) ||
          movie.title?.toLowerCase().includes(keyword) ||
          movie.comment?.toLowerCase().includes(keyword)
        );
      });
    }

    return filtered;
  }, [
    subscribeMovieList,
    hasSearched,
    filterType,
    ratingFilter,
    tagFilter,
    keywordFilter
  ]);

  return (
    <div className='space-y-2'>
      {/* 标题 */}
      <div>
        <h1 className='text-3xl font-bold tracking-tight md:text-4xl'>
          已拥有影片
        </h1>
        <p className='text-muted-foreground mt-2 text-base'>
          共 {subscribeMovieList.length} 部影片
          {hasSearched && ` · 筛选结果: ${libraryMovieList.length} 部`}
        </p>
      </div>

      {/* 筛选器 */}
      <div className='max-w-4xl'>
        <div className='flex flex-col items-stretch gap-3 sm:flex-row sm:items-end'>
          {/* 筛选类型选择 */}
          <div className='w-full flex-shrink-0 sm:w-[140px]'>
            <label className='mb-2 block text-sm font-medium'>筛选类型</label>
            <Select
              value={filterType}
              onValueChange={(value: FilterType) => setFilterType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='keyword'>关键字</SelectItem>
                <SelectItem value='rating'>评分</SelectItem>
                <SelectItem value='tag'>标签</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 筛选值输入 */}
          <div className='min-w-0 flex-1 sm:max-w-md'>
            <label className='mb-2 block text-sm font-medium'>筛选条件</label>
            {filterType === 'rating' && (
              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger>
                  <SelectValue placeholder='选择评分' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='1'>1 星</SelectItem>
                  <SelectItem value='2'>2 星</SelectItem>
                  <SelectItem value='3'>3 星</SelectItem>
                  <SelectItem value='4'>4 星</SelectItem>
                  <SelectItem value='5'>5 星</SelectItem>
                </SelectContent>
              </Select>
            )}
            {filterType === 'tag' && (
              <Select
                value={tagFilter}
                onValueChange={setTagFilter}
                disabled={allTags.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={allTags.length > 0 ? '选择标签' : '暂无标签'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {filterType === 'keyword' && (
              <Input
                placeholder='输入关键字搜索（番号/标题/评价）'
                value={keywordFilter}
                onChange={(e) => setKeywordFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            )}
          </div>

          {/* 操作按钮 */}
          <div className='flex flex-shrink-0 gap-2'>
            <Button
              onClick={handleSearch}
              className='flex-1 gap-2 sm:flex-initial'
            >
              <Search className='h-4 w-4' />
              搜索
            </Button>
            {hasSearched && (
              <Button
                onClick={handleReset}
                variant='outline'
                className='flex-1 sm:flex-initial'
              >
                重置
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 影片网格 */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-6'>
        {libraryMovieList.length === 0 ? (
          <div className='text-muted-foreground col-span-full py-12 text-center'>
            <Film className='mx-auto mb-4 h-12 w-12 opacity-50' />
            <p>暂无符合条件的影片</p>
          </div>
        ) : (
          libraryMovieList.map((item: any) => {
            const proxiedSrc = item.cover
              ? `/api/subscribe/javbus/proxy?url=${encodeURIComponent(item.cover)}`
              : '';
            if (!item.detail) {
              return null;
            }
            // 解析 detail 数据
            const detail = item.detail as {
              stars?: Property[];
              director?: Property;
              videoLength?: number;
            };
            const stars = detail?.stars || [];
            const videoLength = detail?.videoLength;

            return (
              <div key={item.number}>
                {item.cover ? (
                  <MovieDetailDialog movieId={item.number}>
                    <div>
                      <GlareCard className='w-full cursor-pointer transition-transform duration-200 hover:scale-105'>
                        <div className='relative h-full w-full'>
                          {item.cover ? (
                            <img
                              src={proxiedSrc}
                              alt={item.title || ''}
                              className='h-full w-full rounded-lg object-cover'
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className='bg-muted flex h-full w-full items-center justify-center rounded-lg'>
                              <span className='text-muted-foreground text-sm'>
                                无图片
                              </span>
                            </div>
                          )}
                        </div>
                      </GlareCard>
                    </div>
                  </MovieDetailDialog>
                ) : (
                  <div className='bg-muted flex h-full w-full items-center justify-center'>
                    <span className='text-muted-foreground text-sm'>
                      无图片
                    </span>
                  </div>
                )}

                {/* 标题 */}
                <div className='mt-2 mb-2'>
                  {/* 1. 主 Flex 容器 */}
                  <div className='flex items-center justify-between gap-4'>
                    {/* 2. 左侧内容容器，占据所有可用空间 */}
                    <div className='min-w-0 flex-1'>
                      <div>
                        <h3 className='line-clamp-2 w-full truncate text-sm leading-tight font-semibold'>
                          {item.title || '未知标题'}
                        </h3>
                      </div>

                      {/* 番号 */}
                      {item.number && (
                        <div className='text-muted-foreground mt-1 flex items-center gap-2 text-xs'>
                          <Film className='h-3 w-3' />
                          <span>{item.number}</span>
                        </div>
                      )}

                      {/* 主演信息 */}
                      {stars && stars.length > 0 && (
                        <div className='text-muted-foreground mt-1 flex items-center gap-2 text-xs'>
                          <Users className='h-3 w-3 shrink-0' />
                          <span className='line-clamp-1'>
                            {stars.length > 2
                              ? `${stars
                                  .slice(0, 2)
                                  .map((star) => star.name)
                                  .join(', ')} +${stars.length - 2}`
                              : stars.map((star) => star.name).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 3. 右侧删除按钮 */}
                    <div className='flex-shrink-0'>
                      <button
                        onClick={() => handlePlay(item)}
                        className='text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full p-2 transition-colors'
                        aria-label='播放'
                      >
                        <PlayCircle className='h-4 w-4' />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
