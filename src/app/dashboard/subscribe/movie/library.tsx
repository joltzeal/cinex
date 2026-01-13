'use client';

import { GlareCard } from '@/components/ui/glare-card';
import { Users, Film, Search, X, Clapperboard, Filter, PlayCircle } from 'lucide-react';
import { Property } from '@/types/javbus';
import { toast } from 'sonner';
import { Movie } from '@prisma/client';
import { useMediaServer } from '@/contexts/media-server-context';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { SimpleMovieDetailDialog } from '@/components/search/simple-movie-detail-dialog';

type pageProps = {
  subscribeMovieList: Movie[];
};

type FilterType = 'rating' | 'tag' | 'keyword';

export default function LibraryPage(props: pageProps) {
  const { subscribeMovieList } = props;
  const mediaServer = useMediaServer();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [movieData, setMovieData] = useState<Movie | null>(null);
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

  const handlePlay = (e: React.MouseEvent, item: Movie) => {
    e.stopPropagation(); // 防止触发卡片点击
    if (!mediaServer || !mediaServer.publicAddress) {
      toast.error('媒体服务器配置未设置');
      return;
    }
    if (!item.mediaLibrary) {
      toast.error('媒体信息未设置');
      return; // Add return to prevent crash
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
    let filtered = subscribeMovieList;

    // 如果未搜索且没有激活的过滤器，仅显示前 12 个 (原有逻辑保留)
    // 但为了体验更好，如果用户手动清除了所有条件，建议显示全部或分页，这里保留原逻辑
    if (!hasSearched && !ratingFilter && !tagFilter && !keywordFilter) {
      return subscribeMovieList.slice(0, 12);
    }

    // 这里稍微优化了逻辑：只要输入了值就视为搜索意图，不一定非要点搜索按钮
    // 如果你坚持要点搜索按钮才触发，保持原样即可。
    // 下面逻辑是基于 hasSearched 的：

    if (!hasSearched) {
      return subscribeMovieList.slice(0, 12);
    }

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

  const handleClickMovie = (item: Movie) => {
    setMovieData(item);
    setDialogOpen(true);
  }

  return (
    <div className='space-y-6 pb-10 animate-in fade-in duration-500'>
      {/* 顶部标题区 */}
      <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>
            已拥有影片
          </h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            管理和浏览你的本地媒体库
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
          <Clapperboard className="w-4 h-4" />
          <span>总影片: <span className="font-semibold text-foreground">{subscribeMovieList.length}</span> 部</span>
        </div>
      </div>

      <Separator />

      {/* 筛选工具栏 */}
      <div className='bg-card border rounded-xl p-4 shadow-sm'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-end'>

          {/* 筛选类型 */}
          <div className='w-full lg:w-[160px] space-y-2'>
            <label className='text-xs font-medium text-muted-foreground flex items-center gap-1'>
              <Filter className="w-3 h-3" /> 筛选维度
            </label>
            <Select
              value={filterType}
              onValueChange={(value: FilterType) => {
                setFilterType(value);
                // 切换类型时清空其他类型的输入，避免逻辑混乱
                if (value !== 'keyword') setKeywordFilter('');
                if (value !== 'rating') setRatingFilter('');
                if (value !== 'tag') setTagFilter('');
              }}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='keyword'>关键字搜索</SelectItem>
                <SelectItem value='rating'>按评分筛选</SelectItem>
                <SelectItem value='tag'>按标签筛选</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 动态筛选输入区 */}
          <div className='flex-1 space-y-2'>
            <label className='text-xs font-medium text-muted-foreground'>筛选条件</label>
            <div className="relative">
              {filterType === 'rating' && (
                <Select value={ratingFilter} onValueChange={setRatingFilter}>
                  <SelectTrigger className="bg-background w-full">
                    <SelectValue placeholder='选择评分等级' />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map(star => (
                      <SelectItem key={star} value={star.toString()}>
                        {star} 星及以上
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {filterType === 'tag' && (
                <Select
                  value={tagFilter}
                  onValueChange={setTagFilter}
                  disabled={allTags.length === 0}
                >
                  <SelectTrigger className="bg-background w-full">
                    <SelectValue
                      placeholder={allTags.length > 0 ? '选择分类标签' : '暂无可用标签'}
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {allTags.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {filterType === 'keyword' && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9 bg-background"
                    placeholder='搜索番号、标题或评价...'
                    value={keywordFilter}
                    onChange={(e) => setKeywordFilter(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearch();
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 按钮组 */}
          <div className='flex items-center gap-2 pt-1'>
            <Button onClick={handleSearch} className='min-w-[80px]'>
              搜索
            </Button>
            {hasSearched && (
              <Button
                onClick={handleReset}
                variant='ghost'
                className='text-muted-foreground hover:text-foreground'
                size="icon"
                title="重置筛选"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 结果展示区 */}
      {hasSearched && (
        <div className="text-sm text-muted-foreground">
          筛选结果: <span className="text-foreground font-medium">{libraryMovieList.length}</span> 部影片
        </div>
      )}

      {/* 影片网格 - 优化响应式列数 */}
      <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7'>
        {libraryMovieList.length === 0 ? (
          <div className='col-span-full py-20'>
            <EmptyState onReset={handleReset} isSearching={hasSearched} />
          </div>
        ) : (
          (
            libraryMovieList.map((item: any) => {
              const proxiedSrc = item.cover
                ? `/api/subscribe/javbus/proxy?url=${encodeURIComponent(item.cover)}`
                : "";
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
                    
                    // <MovieDetailDialog movieId={item.number}>
                    <div onClick={()=>handleClickMovie(item)}><GlareCard className="w-full cursor-pointer hover:scale-105 transition-transform duration-200">
                      <div className="relative w-full h-full">
                        {item.cover ? (
                          <img
                            src={proxiedSrc}
                            alt={item.title || ''}
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center rounded-lg">
                            <span className="text-muted-foreground text-sm">无图片</span>
                          </div>
                        )}

                      </div>
                    </GlareCard></div>
                    // </MovieDetailDialog>
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground text-sm">无图片</span>
                    </div>
                  )}




                  {/* 标题 */}
                  <div className="mt-2 mb-2">
                    {/* 1. 主 Flex 容器 */}
                    <div className="flex items-center justify-between gap-4">

                      {/* 2. 左侧内容容器，占据所有可用空间 */}
                      <div className="flex-1 min-w-0">
                        <div>
                          <h3 className="font-semibold text-sm line-clamp-2 leading-tight truncate w-full">
                            {item.title || '未知标题'}
                          </h3>
                        </div>

                        {/* 番号 */}
                        {item.number && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Film className="h-3 w-3" />
                            <span>{item.number}</span>
                          </div>
                        )}

                        {/* 主演信息 */}
                        {stars && stars.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Users className="h-3 w-3 shrink-0" />
                            <span className="line-clamp-1">
                              {stars.length > 2
                                ? `${stars.slice(0, 2).map(star => star.name).join(', ')} +${stars.length - 2}`
                                : stars.map(star => star.name).join(', ')
                              }
                            </span>
                          </div>
                        )}

                      </div>

                      {/* 3. 右侧删除按钮 */}
                      <div className="flex-shrink-0">

                        <button
                          onClick={(e) => handlePlay(e, item)}
                          className="p-2 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          aria-label="播放"
                        >
                          <PlayCircle className="h-4 w-4" />
                        </button>

                      </div>

                    </div>
                  </div>
                  
                </div>

              );
            })
          )
        )}
      </div>
      <SimpleMovieDetailDialog
                    movie={movieData}
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                  />
    </div>
  );
}

// 抽取出来的空状态组件
function EmptyState({ onReset, isSearching }: { onReset: () => void, isSearching: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95 duration-300">
      <div className="bg-muted/30 p-6 rounded-full ring-1 ring-border">
        {isSearching ? (
          <Search className="h-10 w-10 text-muted-foreground/50" />
        ) : (
          <Film className="h-10 w-10 text-muted-foreground/50" />
        )}
      </div>
      <div className="max-w-xs space-y-1">
        <h3 className="font-semibold text-lg">
          {isSearching ? '没有找到相关影片' : '暂无影片数据'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isSearching
            ? '尝试更换关键词或筛选条件，也可以清除筛选查看全部。'
            : '你的媒体库似乎是空的，快去添加一些订阅吧。'}
        </p>
      </div>
      {isSearching && (
        <Button onClick={onReset} variant="outline" className="mt-4">
          清除所有筛选
        </Button>
      )}
    </div>
  )
}