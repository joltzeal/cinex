'use client';

import { useMemo, useState } from 'react';
import type { Movie } from '@prisma/client';
import {
  BadgeCheck,
  Clapperboard,
  Film,
  Filter,
  PlayCircle,
  Search,
  Star,
  Tag,
  UserRound,
  Users,
  X
} from 'lucide-react';
import { toast } from 'sonner';

import { SimpleMovieDetailDialog } from '@/components/search/simple-movie-detail-dialog';
import { GlareCard } from '@/components/ui/glare-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger
} from '@/components/ui/select';
import { TabsSelect } from '@/components/ui/tabs-select';
import { useMediaServer } from '@/contexts/media-server-context';
import { genres as genreTabs } from '@/constants/data';
import { Property } from '@/types/javbus';

type PageProps = {
  subscribeMovieList: Movie[];
};

type MovieDetailForFilter = {
  stars?: Property[];
  starts?: Property[];
  genres?: Property[];
};

type FilterState = {
  keyword: string;
  rating: string;
  tag: string;
  actor: string;
  genre: string;
  status: string;
};

const EMPTY_FILTERS: FilterState = {
  keyword: '',
  rating: '',
  tag: '',
  actor: '',
  genre: '',
  status: ''
};

const STATUS_OPTIONS = [
  { value: 'uncheck', label: '未检查' },
  { value: 'checked', label: '已检查' },
  { value: 'undownload', label: '未下载' },
  { value: 'downloading', label: '下载中' },
  { value: 'downloaded', label: '已下载' },
  { value: 'added', label: '已入库' },
  { value: 'subscribed', label: '已订阅' },
  { value: 'transfered', label: '已整理' }
];

function getMovieDetail(movie: Movie) {
  return (movie.detail || {}) as MovieDetailForFilter;
}

function getMovieStars(movie: Movie) {
  const detail = getMovieDetail(movie);
  if (Array.isArray(detail.stars)) return detail.stars;
  if (Array.isArray(detail.starts)) return detail.starts;
  return [];
}

function getMovieGenres(movie: Movie) {
  const detail = getMovieDetail(movie);
  return Array.isArray(detail.genres) ? detail.genres : [];
}

function getStatusLabel(status: string) {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label || status;
}

function includesKeyword(value: unknown, keyword: string) {
  return String(value || '').toLowerCase().includes(keyword);
}

function proxyImage(url: string) {
  return `/api/subscribe/javbus/proxy?url=${encodeURIComponent(url)}`;
}

export default function LibraryPage({ subscribeMovieList }: PageProps) {
  const mediaServer = useMediaServer();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [movieData, setMovieData] = useState<Movie | null>(null);
  const [draftFilters, setDraftFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<FilterState>(EMPTY_FILTERS);

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    subscribeMovieList.forEach((movie) => {
      if (movie.tags && Array.isArray(movie.tags)) {
        (movie.tags as string[]).forEach((tag) => tagsSet.add(tag));
      }
    });
    return Array.from(tagsSet).sort((a, b) => a.localeCompare(b));
  }, [subscribeMovieList]);

  const allActors = useMemo(() => {
    const actorSet = new Set<string>();
    subscribeMovieList.forEach((movie) => {
      getMovieStars(movie).forEach((star) => {
        if (star.name) actorSet.add(star.name);
      });
    });
    return Array.from(actorSet).sort((a, b) => a.localeCompare(b));
  }, [subscribeMovieList]);

  const hasActiveFilters = Boolean(
    appliedFilters.keyword ||
      appliedFilters.rating ||
      appliedFilters.tag ||
      appliedFilters.actor ||
      appliedFilters.genre ||
      appliedFilters.status
  );

  const libraryMovieList = useMemo(() => {
    const keyword = appliedFilters.keyword.trim().toLowerCase();

    return subscribeMovieList.filter((movie) => {
      const stars = getMovieStars(movie);
      const movieGenres = getMovieGenres(movie);
      const movieTags = Array.isArray(movie.tags) ? (movie.tags as string[]) : [];

      if (keyword) {
        const searchable = [
          movie.number,
          movie.title,
          movie.comment,
          getStatusLabel(movie.status),
          ...movieTags,
          ...stars.map((star) => star.name),
          ...movieGenres.map((genre) => genre.name)
        ];

        if (!searchable.some((item) => includesKeyword(item, keyword))) {
          return false;
        }
      }

      if (appliedFilters.rating) {
        const rating = Number(movie.rating || 0);
        if (!rating || rating < Number(appliedFilters.rating)) {
          return false;
        }
      }

      if (appliedFilters.tag && !movieTags.includes(appliedFilters.tag)) {
        return false;
      }

      if (
        appliedFilters.actor &&
        !stars.some((star) => star.name === appliedFilters.actor)
      ) {
        return false;
      }

      if (
        appliedFilters.genre &&
        !movieGenres.some((genre) => genre.name === appliedFilters.genre)
      ) {
        return false;
      }

      if (appliedFilters.status && movie.status !== appliedFilters.status) {
        return false;
      }

      return true;
    });
  }, [
    subscribeMovieList,
    appliedFilters
  ]);

  const handlePlay = (event: React.MouseEvent, item: Movie) => {
    event.stopPropagation();
    if (!mediaServer?.publicAddress) {
      toast.error('媒体服务器配置未设置');
      return;
    }
    if (!item.mediaLibrary) {
      toast.error('媒体信息未设置');
      return;
    }

    const mediaInfo = item.mediaLibrary as any;
    if (!mediaInfo?.Id || !mediaInfo?.ServerId) {
      toast.error('媒体信息不完整');
      return;
    }

    window.open(
      `${mediaServer.publicAddress}/web/index.html#!/item?id=${mediaInfo.Id}&serverId=${mediaInfo.ServerId}`,
      '_blank'
    );
  };

  const handleReset = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  };

  const handleSearch = () => {
    setAppliedFilters(draftFilters);
  };

  const updateDraftFilter = (key: keyof FilterState, value: string) => {
    setDraftFilters((current) => ({
      ...current,
      [key]: value
    }));
  };

  const handleClickMovie = (item: Movie) => {
    if (item.detail) {
      setMovieData(item);
      setDialogOpen(true);
      return;
    }

    const fetchMovieData = async () => {
      const response = await fetch(`/api/movie/${item.number}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('请求失败: JavBus未收录该影片');
        }
        throw new Error(`请求失败: ${response.status}`);
      }

      const result = await response.json();

      if (!result || !result.data) {
        throw new Error('未找到影片数据。');
      }

      return result.data;
    };

    const toastId = toast.loading('正在加载影片信息...');

    fetchMovieData()
      .then((data) => {
        toast.dismiss(toastId);
        setMovieData(data);
        setDialogOpen(true);
      })
      .catch((error) => {
        toast.error(error.message || '加载数据时发生未知错误。', {
          id: toastId
        });
        console.error('Failed to load movie:', error);
      });
  };

  return (
    <div className='animate-in fade-in space-y-6 pb-10 duration-500'>
      <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>影片管理</h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            管理和浏览你的本地媒体库
          </p>
        </div>
        <div className='bg-secondary/50 text-muted-foreground flex items-center gap-2 rounded-full px-3 py-1 text-sm'>
          <Clapperboard className='h-4 w-4' />
          <span>
            总影片:{' '}
            <span className='text-foreground font-semibold'>
              {subscribeMovieList.length}
            </span>{' '}
            部
          </span>
        </div>
      </div>

      <Separator />

      <div className='rounded-xl border bg-card p-4 shadow-sm'>
        <div className='mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <div className='flex items-center gap-2 text-sm font-medium'>
            <Filter className='h-4 w-4' />
            组合筛选
          </div>
          <div className='flex items-center gap-2'>
            <Button onClick={handleSearch} className='min-w-24'>
              <Search className='mr-1 h-4 w-4' />
              搜索
            </Button>
            <Button onClick={handleReset} variant='outline'>
              <X className='mr-1 h-4 w-4' />
              重置
            </Button>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,1.35fr)_minmax(120px,0.7fr)_minmax(150px,0.85fr)_minmax(140px,0.8fr)_minmax(150px,0.9fr)_minmax(130px,0.75fr)]'>
          <div className='space-y-2'>
            <label className='text-muted-foreground flex items-center gap-1 text-xs font-medium'>
              <Search className='h-3 w-3' /> 关键词
            </label>
            <div className='relative'>
              <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
              <Input
                className='bg-background pl-9'
                placeholder='番号、标题、评价、演员、类型...'
                value={draftFilters.keyword}
                onChange={(event) =>
                  updateDraftFilter('keyword', event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </div>
          </div>

          <FilterSelect
            icon={<Star className='h-3 w-3' />}
            label='评分'
            placeholder='全部评分'
            value={draftFilters.rating}
            onValueChange={(value) => updateDraftFilter('rating', value)}
            options={[5, 4, 3, 2, 1].map((star) => ({
              value: star.toString(),
              label: `${star} 星及以上`
            }))}
          />

          <div className='space-y-2'>
            <label className='text-muted-foreground flex items-center gap-1 text-xs font-medium'>
              <Clapperboard className='h-3 w-3' /> Genres
            </label>
            <TabsSelect
              tabs={genreTabs}
              value={draftFilters.genre}
              onValueChange={(value) => updateDraftFilter('genre', value)}
              placeholder='全部类型'
            />
          </div>

          <FilterSelect
            icon={<Tag className='h-3 w-3' />}
            label='标签'
            placeholder={allTags.length > 0 ? '全部标签' : '暂无标签'}
            value={draftFilters.tag}
            onValueChange={(value) => updateDraftFilter('tag', value)}
            options={allTags.map((tag) => ({ value: tag, label: tag }))}
            disabled={allTags.length === 0}
          />

          <FilterSelect
            icon={<Users className='h-3 w-3' />}
            label='演员'
            placeholder={allActors.length > 0 ? '全部演员' : '暂无演员'}
            value={draftFilters.actor}
            onValueChange={(value) => updateDraftFilter('actor', value)}
            options={allActors.map((actor) => ({ value: actor, label: actor }))}
            disabled={allActors.length === 0}
          />

          <FilterSelect
            icon={<BadgeCheck className='h-3 w-3' />}
            label='状态'
            placeholder='全部状态'
            value={draftFilters.status}
            onValueChange={(value) => updateDraftFilter('status', value)}
            options={STATUS_OPTIONS}
          />
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-2 text-sm text-muted-foreground'>
        <span>
          筛选结果:{' '}
          <span className='text-foreground font-medium'>
            {libraryMovieList.length}
          </span>{' '}
          部影片
        </span>
        {hasActiveFilters && (
          <div className='flex flex-wrap gap-2'>
            {appliedFilters.keyword && (
              <BadgePill label={`关键词: ${appliedFilters.keyword}`} />
            )}
            {appliedFilters.rating && (
              <BadgePill label={`${appliedFilters.rating} 星及以上`} />
            )}
            {appliedFilters.tag && (
              <BadgePill label={`标签: ${appliedFilters.tag}`} />
            )}
            {appliedFilters.actor && (
              <BadgePill label={`演员: ${appliedFilters.actor}`} />
            )}
            {appliedFilters.genre && (
              <BadgePill label={`类型: ${appliedFilters.genre}`} />
            )}
            {appliedFilters.status && (
              <BadgePill
                label={`状态: ${getStatusLabel(appliedFilters.status)}`}
              />
            )}
          </div>
        )}
      </div>

      <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5'>
        {libraryMovieList.length === 0 ? (
          <div className='col-span-full py-20'>
            <EmptyState onReset={handleReset} isSearching={hasActiveFilters} />
          </div>
        ) : (
          libraryMovieList.map((item) => {
            const stars = getMovieStars(item);
            const proxiedSrc = item.cover ? proxyImage(item.cover) : '';

            return (
              <article
                key={item.id || item.number}
                className='min-w-0'
              >
                <div onClick={() => handleClickMovie(item)}>
                  <GlareCard className='w-full cursor-pointer transition-transform duration-200 hover:scale-[1.02]'>
                    <div className='relative h-full w-full'>
                      {item.cover ? (
                        <img
                          src={proxiedSrc}
                          alt={item.title || ''}
                          loading='lazy'
                          decoding='async'
                          className='h-full w-full rounded-lg object-cover'
                          onError={(event) => {
                            const target = event.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className='flex h-full w-full items-center justify-center rounded-lg bg-muted'>
                          <span className='text-muted-foreground text-sm'>
                            无图片
                          </span>
                        </div>
                      )}
                    </div>
                  </GlareCard>
                </div>

                <div className='mt-2 mb-4'>
                  <div className='flex items-center justify-between gap-3'>
                    <div className='min-w-0 flex-1'>
                      <h3 className='line-clamp-2 text-sm leading-tight font-semibold'>
                        {item.title || '未知标题'}
                      </h3>
                      {item.number && (
                        <div className='text-muted-foreground mt-1 flex items-center gap-2 text-xs'>
                          <Film className='h-3 w-3' />
                          <span>{item.number}</span>
                        </div>
                      )}
                      {stars.length > 0 && (
                        <div className='text-muted-foreground mt-1 flex items-center gap-2 text-xs'>
                          <UserRound className='h-3 w-3 shrink-0' />
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

                    <button
                      onClick={(event) => handlePlay(event, item)}
                      className='text-muted-foreground hover:bg-primary/10 hover:text-primary shrink-0 rounded-full p-2 transition-colors'
                      aria-label='播放'
                    >
                      <PlayCircle className='h-4 w-4' />
                    </button>
                  </div>
                </div>
              </article>
            );
          })
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

function FilterSelect({
  label,
  icon,
  placeholder,
  value,
  onValueChange,
  options,
  disabled
}: {
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className='space-y-2'>
      <label className='text-muted-foreground flex items-center gap-1 text-xs font-medium'>
        {icon}
        {label}
      </label>
      <Select
        value={value || undefined}
        onValueChange={(nextValue) => onValueChange(nextValue || '')}
        disabled={disabled}
      >
        <SelectTrigger className='w-full bg-background'>
          <span className={value ? '' : 'text-muted-foreground'}>
            {selectedOption?.label || placeholder}
          </span>
        </SelectTrigger>
        <SelectContent className='max-h-75'>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function BadgePill({ label }: { label: string }) {
  return (
    <span className='bg-secondary text-secondary-foreground rounded-full px-2.5 py-1 text-xs'>
      {label}
    </span>
  );
}

function EmptyState({
  onReset,
  isSearching
}: {
  onReset: () => void;
  isSearching: boolean;
}) {
  return (
    <div className='animate-in zoom-in-95 flex flex-col items-center justify-center space-y-4 text-center duration-300'>
      <div className='rounded-full bg-muted/30 p-6 ring-1 ring-border'>
        {isSearching ? (
          <Search className='text-muted-foreground/50 h-10 w-10' />
        ) : (
          <Film className='text-muted-foreground/50 h-10 w-10' />
        )}
      </div>
      <div className='max-w-xs space-y-1'>
        <h3 className='text-lg font-semibold'>
          {isSearching ? '没有找到相关影片' : '暂无影片数据'}
        </h3>
        <p className='text-muted-foreground text-sm'>
          {isSearching
            ? '尝试更换关键词或筛选条件，也可以清除筛选查看全部。'
            : '你的媒体库似乎是空的，快去添加一些订阅吧。'}
        </p>
      </div>
      {isSearching && (
        <Button onClick={onReset} variant='outline' className='mt-4'>
          清除所有筛选
        </Button>
      )}
    </div>
  );
}
