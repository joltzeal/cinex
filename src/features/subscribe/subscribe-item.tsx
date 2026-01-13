'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Movie, MovieStatus, Prisma } from '@prisma/client';
import {
  Bookmark,
  Building, Clapperboard,
  Film,
  PlayCircle,
  Tag,
  User,
  Trash2, List,
  FilterX,
  Tags,
  FileQuestion,
  Grab, Download
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { JellyfinMediaItem } from '@/lib/media-library/jellyfin-client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { useState, useRef, useEffect } from 'react';
import { SimpleMovieDetailDialog } from '@/components/search/simple-movie-detail-dialog';
import { MovieDetail, Property } from '@/types/javbus';
import {
  Empty, EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty';
import { IconBell } from '@tabler/icons-react';
import { useMediaServer } from '@/contexts/media-server-context';
import { LazyImage } from '@/components/lazy-image';

type SubscribeWithMovies = Prisma.SubscribeGetPayload<{
  include: { movies: { include: { movie: true } } };
}>;

const statusMap: {
  [key in MovieStatus]: {
    label: string | null;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  };
} = {
  // 这些状态将不会显示 Badge
  uncheck: { label: null, variant: 'secondary' },
  checked: { label: null, variant: 'outline' },
  undownload: { label: null, variant: 'outline' },
  downloading: { label: '下载中', variant: 'default' },
  downloaded: { label: '已完成', variant: 'default' },
  added: { label: '已入库', variant: 'destructive' },
  subscribed: { label: '已订阅', variant: 'default' },
  transfered: { label: '已转移', variant: 'default' }
};
const filterTypeMap = {
  genre: { label: '类别', icon: Tag },
  director: { label: '导演', icon: User },
  studio: { label: '制作商', icon: Building },
  label: { label: '发行商', icon: Film },
  series: { label: '系列', icon: Clapperboard },
  star: { label: '演员', icon: User } // 'star' 应该总是有 starInfo，但作为备用
};

const genresMap = {
  合集: '合集',
  介紹影片: '写真',
  VR専用: 'VR',
  '女優ベスト・総集編': '个人合集'
};

function getGenres(genres: Property[]): string[] {
  return genres
    .map((genre) => genresMap[genre.name as keyof typeof genresMap])
    .filter(Boolean);
}
export default function JavbusSubscribeInfoItem({
  info
}: {
  info: SubscribeWithMovies;
}) {
  const mediaServer = useMediaServer();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [showSubscribeDialog, setShowSubscribeDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showFetchDialog, setShowFetchDialog] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isHidden, setIsHidden] = useState(false);
  // 筛选模式：0-全部, 1-排除特定tag, 2-只显示特定tag, 3-detail为空
  const [filterMode, setFilterMode] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [movieData, setMovieData] = useState<Movie | null>(null);
  // 使用原生事件监听器来更好地控制滚轮事件
  useEffect(() => {
    const scrollAreaElement = scrollAreaRef.current;
    if (!scrollAreaElement) return;

    const handleNativeWheel = (e: WheelEvent) => {
      const scrollContainer = scrollAreaElement.querySelector(
        '[data-radix-scroll-area-viewport]'
      );
      if (scrollContainer) {
        const canScrollHorizontally =
          scrollContainer.scrollWidth > scrollContainer.clientWidth;

        if (canScrollHorizontally) {
          // 完全阻止事件
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          // 将垂直滚动转换为横向滚动
          scrollContainer.scrollLeft += e.deltaY;
        }
      }
    };

    // 添加原生事件监听器，使用 capture 阶段和 passive: false
    scrollAreaElement.addEventListener('wheel', handleNativeWheel, {
      passive: false,
      capture: true
    });

    return () => {
      scrollAreaElement.removeEventListener('wheel', handleNativeWheel, {
        capture: true
      } as any);
    };
  }, []);

  const handleFilterClick = (filter: any) => {
    window.open(
      `https://www.javbus.com/${filter.type}/${filter.value}`,
      '_blank'
    );
  };
  const handleFetch = async () => {
    setIsFetching(true);
    setShowFetchDialog(false);
    try {
      const response = await fetch(`/api/subscribe/${info.id}`, {
        method: 'PUT'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '抓取失败');
      }
      toast.success('抓取成功');
      router.refresh();
    } catch (error) {
      console.error('抓取失败:', error);
      toast.error(error instanceof Error ? error.message : '抓取失败');
    } finally {
      setIsFetching(false);
    }
  };
  const handleSubscribe = async () => {
    setIsSubscribing(true);
    setShowSubscribeDialog(false);
    try {
      const response = await fetch(`/api/subscribe/${info.id}`, {
        method: 'POST'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '订阅失败');
      }
      toast.success('订阅成功');
      router.refresh();
    } catch (error) {
      console.error('订阅失败:', error);
      toast.error(error instanceof Error ? error.message : '订阅失败');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setShowDeleteDialog(false);

    try {
      const response = await fetch(`/api/subscribe/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscribeId: info.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '删除失败');
      }

      toast.success('订阅删除成功');
      router.refresh();
    } catch (error) {
      console.error('删除订阅失败:', error);
      toast.error(error instanceof Error ? error.message : '删除失败');
    } finally {
      setIsDeleting(false);
    }
  };

  let headerContent;
  const filter = info.filter as any;
  const filterMapping = filterTypeMap[
    filter.type as keyof typeof filterTypeMap
  ] || { label: filter.type, icon: Bookmark };
  if (info.filter) {
    let icon;
    if (info.starInfo) {
      const star = info.starInfo as any;
      const proxiedAvatarSrc = star.avatar
        ? `/api/subscribe/javbus/proxy?url=${encodeURIComponent(star.avatar)}`
        : '';
      icon = (
        <LazyImage
          src={proxiedAvatarSrc}
          alt={star.name || 'Star'}
          className='h-full w-full rounded-2xl object-cover'
        />
      );
    } else {
      icon = (
        <filterMapping.icon className='text-muted-foreground h-6 w-6 rounded-2xl' />
      );
    }

    headerContent = (
      <div className='flex justify-between'>
        <div className='flex min-w-0 flex-1 items-start space-x-3'>
          {/* 图标 */}
          { }
          <div className='bg-muted relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl'>
            {icon}
          </div>

          {/* 文本 */}
          <div className='min-w-0 flex-1'>
            <h3
              className='text-foreground w-full max-w-full truncate font-semibold decoration-2 underline-offset-2 hover:underline'
              title={filter.name}
              onClick={() => handleFilterClick(filter)}
              style={{ cursor: 'pointer' }}
            >
              {filter.name}
            </h3>
            <p className='text-muted-foreground w-full truncate text-sm'>
              {filterMapping.label}
            </p>
          </div>
        </div>
      </div>
    );
  } else {
    headerContent = (
      <div className='flex justify-between'>
        <h3 className='text-foreground font-semibold'>未知订阅</h3>
      </div>
    );
  }
  const handleHide = () => {
    setIsHidden(true);
  };

  // 切换筛选模式
  const handleFilterModeToggle = () => {
    setFilterMode((prev) => (prev + 1) % 6);
  };

  // 筛选电影的特定tags
  const excludeTags = ['合集', '介紹影片', 'VR専用', '女優ベスト・総集編'];

  // 筛选逻辑
  const filterMovie = (movieWrapper: any) => {
    if (isHidden) return false;

    const movie = movieWrapper.movie;
    const movieDetail = movie.detail as unknown as MovieDetail | null;

    switch (filterMode) {
      case 0: // 全部显示
        return true;
      case 1: // 排除包含特定tag的电影
        if (!movieDetail || !movieDetail.genres) return true;
        return !movieDetail.genres.some((genre: Property) =>
          excludeTags.includes(genre.name)
        );
      case 2: // 只显示包含特定tag的电影
        if (!movieDetail || !movieDetail.genres) return false;
        return movieDetail.genres.some((genre: Property) =>
          excludeTags.includes(genre.name)
        );
      case 3: // 只显示detail为空的电影
        return movie.status === MovieStatus.downloading;
      case 4:
        return movie.status === MovieStatus.added;
      case 5:
        return !movieDetail;
      default:
        return true;
    }
  };

  // 获取当前筛选模式的图标和提示
  const getFilterModeIcon = () => {
    switch (filterMode) {
      case 0:
        return { icon: <List className='h-4 w-4' />, title: '显示全部' };
      case 1:
        return {
          icon: <FilterX className='h-4 w-4' />,
          title: '排除合集/写真/VR'
        };
      case 2:
        return {
          icon: <Tags className='h-4 w-4' />,
          title: '仅显示合集/写真/VR'
        };
      case 3:
        return {
          icon: <Download className='h-4 w-4' />,
          title: '仅显示已下载'
        };
      case 4:
        return {
          icon: <Film className='h-4 w-4' />,
          title: '仅显示已添加媒体库'
        };
      case 5:
        return {
          icon: <FileQuestion className='h-4 w-4' />,
          title: '仅显示无详情'
        };

      default:
        return { icon: <List className='h-4 w-4' />, title: '显示全部' };
    }
  };

  const filterModeConfig = getFilterModeIcon();

  const handleClickSubscribeItem = (movie: Movie) => () => {
    if (!movie.number) {
      toast.error('影片编号不存在');
      return;
    }

    const fetchMovieData = async () => {
      const response = await fetch(`/api/movie/${movie.number}`);


      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`请求失败: JavBus未收录该影片`);
        }
        throw new Error(`请求失败: ${response.status}`);
      }

      const result = await response.json();


      console.log(result);
      

      if (!result || !result.data) {
        throw new Error('未找到影片数据。');
      }

      return result.data;
    };

    const promise = fetchMovieData();
    const toastId = toast.loading('正在加载影片信息...');

    promise
      .then((data) => {
        toast.dismiss(toastId);
        setMovieData(data);
        setDialogOpen(true);
      })
      .catch((err) => {
        toast.error(err.message || '加载数据时发生未知错误。', {
          id: toastId
        });
        console.error('Failed to load movie:', err);
      });
  };
  return (
    <Card className='table w-full table-fixed'>
      <CardHeader className='pb-1'>
        <div className='flex items-start justify-between gap-2 sm:items-center'>
          {/* 4. 渲染动态生成的 headerContent */}
          <div className='min-w-0 flex-1 overflow-hidden'>{headerContent}</div>
          {/* 更新时间 Badge 和删除按钮 */}
          <div className='flex shrink-0 items-center space-x-1 sm:space-x-2'>
            <div className='flex flex-col items-end space-y-1'>
              <div className='flex items-center space-x-1'>
                <Badge variant='default'>{info.movies.length} 部影片</Badge>
                {info.movies.filter(
                  (movie: any) => movie.movie.status === MovieStatus.downloading
                ).length > 0 && (
                    <Badge variant='outline'>
                      {
                        info.movies.filter(
                          (movie: any) =>
                            movie.movie.status === MovieStatus.downloading
                        ).length
                      }{' '}
                      部正在下载
                    </Badge>
                  )}
                {info.movies.filter(
                  (movie: any) => movie.movie.status === MovieStatus.added
                ).length > 0 && (
                    <Badge variant='destructive'>
                      媒体库中已添加
                      {
                        info.movies.filter(
                          (movie: any) => movie.movie.status === MovieStatus.added
                        ).length
                      }{' '}
                      部
                    </Badge>
                  )}
              </div>

              <Badge variant='outline'>
                更新时间：{new Date(info.updatedAt).toLocaleString()}
              </Badge>
            </div>

            <AlertDialog
              open={showDeleteDialog}
              onOpenChange={setShowDeleteDialog}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='text-muted-foreground hover:text-destructive h-8 w-8'
                  title='删除订阅'
                  disabled={isDeleting}
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认删除订阅</AlertDialogTitle>
                  <AlertDialogDescription>
                    确定要删除这个订阅吗？这将永久删除所有相关的电影数据，此操作无法撤销。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>
                    取消
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  >
                    {isDeleting ? '删除中...' : '确认删除'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog
              open={showFetchDialog}
              onOpenChange={setShowFetchDialog}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='text-muted-foreground hover:text-destructive h-8 w-8'
                  title='抓取全部'
                  disabled={isFetching}
                >
                  <Grab className='h-4 w-4' />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>全部订阅</AlertDialogTitle>
                  <AlertDialogDescription>
                    确定要抓取这个订阅吗？这将抓取所有没有详情的影片。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isFetching}>
                    取消
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleFetch}
                    disabled={isFetching}
                  >
                    {isFetching ? '抓取中...' : '确认抓取'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              variant='ghost'
              size='icon'
              className='text-muted-foreground hover:text-primary h-8 w-8'
              title={filterModeConfig.title}
              onClick={handleFilterModeToggle}
            >
              {filterModeConfig.icon}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className='py-0'>
        <ScrollArea
          ref={scrollAreaRef}
          className='w-full rounded-md whitespace-nowrap'
        >
          {info.movies.filter(filterMovie).length === 0 && (
            <Empty className='from-muted/50 to-background h-full bg-linear-to-b from-30%'>
              <EmptyHeader>
                <EmptyMedia variant='icon'>
                  <IconBell />
                </EmptyMedia>
                <EmptyTitle>没有影片</EmptyTitle>
                <EmptyDescription>当前筛选模式下没有影片</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {info.movies.filter(filterMovie).length > 0 && (
            <div className='flex w-max space-x-4 p-4'>
              {info.movies.filter(filterMovie).map((_movie: any) => {
                const movie = _movie.movie; // 明确 movie 类型
                const proxiedSrc = movie.poster
                  ? `/api/subscribe/javbus/proxy?url=${encodeURIComponent(movie.poster)}`
                  : '';

                if (!movie.number) return null;

                // 4. 从映射中获取当前状态的配置
                const statusConfig =
                  statusMap[movie.status as MovieStatus] || statusMap.uncheck;
                const mediaInfo =
                  movie.mediaLibrary as JellyfinMediaItem | null;
                return (
                  <div className='group flex w-25 shrink-0 cursor-pointer flex-col items-center space-y-2' onClick={handleClickSubscribeItem(movie)}>
                    <div className='bg-muted relative h-37.5 w-full overflow-hidden rounded-md' >
                      <LazyImage
                        src={proxiedSrc}
                        alt={movie.title}
                        className='h-full w-full object-cover'
                      />

                      {statusConfig && statusConfig.label && (
                        <Badge
                          variant={statusConfig.variant}
                          // 3. 调整 Badge 样式
                          className='absolute top-1.5 right-1.5 h-4 px-1.5 text-[10px] font-semibold backdrop-blur-sm'
                        >
                          {statusConfig.label}
                        </Badge>
                      )}
                      {movie.status === 'added' &&
                        mediaInfo &&
                        mediaServer &&
                        mediaServer.publicAddress && (
                          <a
                            href={`${mediaServer.publicAddress}/web/index.html#!/item?id=${mediaInfo.Id}&serverId=${mediaInfo.ServerId}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            // 阻止点击事件冒泡到父级的 MovieDetailsTrigger
                            onClick={(e) => e.stopPropagation()}
                            className='absolute right-1.5 bottom-1.5 z-10 cursor-pointer'
                          >
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-7 w-7 bg-black/50 text-white hover:bg-black/70 hover:text-white'
                            >
                              <PlayCircle className='h-5 w-5' />
                            </Button>
                          </a>
                        )}
                      {
                        movie.detail &&
                        (movie.detail as unknown as MovieDetail).genres.some(
                          (tag: any) => tag.name in genresMap
                        ) && (
                          <Badge
                            variant={'destructive'}
                            className='absolute bottom-1.5 left-1.5 h-4 px-1.5 text-[10px] font-semibold backdrop-blur-sm'
                          >
                            {getGenres(
                              (movie.detail as unknown as MovieDetail).genres
                            ).join('/')}
                          </Badge>
                        )}
                    </div>
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className='text-foreground group-hover:text-primary w-full truncate text-center text-xs leading-tight'>
                            {movie.number}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className='max-w-xs'>{movie.title}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <p className='text-muted-foreground truncate text-xs leading-tight'>
                      {movie.date}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
          <ScrollBar orientation='horizontal' />
        </ScrollArea>
      </CardContent>

      <SimpleMovieDetailDialog
        movie={movieData}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </Card>
  );
}
