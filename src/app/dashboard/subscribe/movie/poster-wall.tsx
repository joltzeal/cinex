'use client';
import { GlareCard } from '@/components/ui/glare-card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import {
  Clock,
  Users,
  Download,
  Trash2,
  Rss,
  PlayCircle,
  Film, ChevronUp
} from 'lucide-react';
import { Property } from '@/types/javbus';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Movie } from '@prisma/client';
import { zhCN } from 'date-fns/locale';
import { useMediaServer } from '@/contexts/media-server-context';
import { LazyImage } from '@/components/lazy-image';
import { useState } from 'react';
import { SimpleMovieDetailDialog } from '@/components/search/simple-movie-detail-dialog';

type pageProps = {
  subscribeMovieList: Movie[];
  status: 'subscribed' | 'downloading' | 'downloaded' | 'added';
};

export default function SubscribePosterWallPage(props: pageProps) {
  const { subscribeMovieList, status } = props;
  const router = useRouter();
  const mediaServer = useMediaServer();
  const [isExpanded, setIsExpanded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [movieData, setMovieData] = useState<Movie | null>(null);
  const DISPLAY_LIMIT = 19;
  const hasMore = subscribeMovieList.length > 20;
  const displayList = hasMore && !isExpanded
    ? subscribeMovieList.slice(0, DISPLAY_LIMIT)
    : subscribeMovieList;
  const remainingCount = subscribeMovieList.length - DISPLAY_LIMIT;

  const handlePlay = async (item: Movie) => {
    
    if (mediaServer && mediaServer.publicAddress) {
      window.open(
        `${mediaServer.publicAddress}/web/index.html#!/item?id=${(item.mediaLibrary as any)?.Id}&serverId=${(item.mediaLibrary as any)?.ServerId}`,
        '_blank'
      );
    }

  };

  const handleDelete = async (item: Movie) => {
    const response = await fetch(`/api/movie/${item.number}/subscribe`, {
      method: 'DELETE'
    });
    if (response.ok) {
      toast.success('删除成功');
      router.refresh();
    } else {
      toast.error('删除失败');
    }
  };

  const onClickMovie = (item: Movie) => {
    setMovieData(item);
    setDialogOpen(true);
  }

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-5'>
      {displayList.map((item: any) => {
        const proxiedSrc = item.cover
          ? `/api/subscribe/javbus/proxy?url=${encodeURIComponent(item.cover)}`
          : '';
        if (!item.detail) {
          return null;
        }
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
              <div onClick={() => onClickMovie(item)}>
                <GlareCard className='w-full cursor-pointer transition-transform duration-200 hover:scale-105'>
                  <div className='relative h-full w-full'>
                    <LazyImage
                      src={proxiedSrc}
                      alt={item.title || ''}
                      className='h-full w-full rounded-lg object-cover'
                      fallbackText='无图片'
                    />

                    <div className='absolute top-3 left-3'>
                      <Badge
                        variant='secondary'
                        className='border-none bg-black/70 font-mono text-xs text-white'
                      >
                        {item.number}
                      </Badge>
                    </div>

                    {status === 'added' && (
                      <div className='absolute top-3 right-3'>
                        <Badge
                          variant='secondary'
                          className='flex items-center border-none bg-black/70 font-mono text-xs text-white'
                        >
                          <Rss className='mr-1 h-3 w-3' />
                        </Badge>
                      </div>
                    )}

                    {videoLength && (
                      <div className='absolute right-3 bottom-3'>
                        <Badge
                          variant='secondary'
                          className='border-none bg-black/70 text-xs text-white'
                        >
                          <Clock className='mr-1 h-3 w-3' />
                          {videoLength}分钟
                        </Badge>
                      </div>
                    )}
                  </div>
                </GlareCard>
              </div>
            ) : (
              <div className='bg-muted flex h-full w-full items-center justify-center'>
                <span className='text-muted-foreground text-sm'>无图片</span>
              </div>
            )}

            <div className='mt-2 mb-2'>
              <div className='flex items-center justify-between gap-4'>
                <div className='min-w-0 flex-1'>
                  <div>
                    <h3 className='line-clamp-2 w-full truncate text-sm leading-tight font-semibold'>
                      {item.title || '未知标题'}
                    </h3>
                  </div>

                  {item.number && (
                    <div className='text-muted-foreground mt-1 flex items-center gap-2 text-xs'>
                      <Film className='h-3 w-3' />
                      <span>{item.number}</span>
                    </div>
                  )}

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
                  {status === 'downloading' && item.downloadAt && (
                    <div className='text-muted-foreground mt-1 flex items-center gap-2 text-xs'>
                      <Download className='h-3 w-3' />
                      <span>
                        {formatDistanceToNow(item.downloadAt, {
                          addSuffix: true,
                          locale: zhCN
                        })}
                      </span>
                    </div>
                  )}
                  {status === 'subscribed' && item.subscribeAt && (
                    <div className='text-muted-foreground mt-1 flex items-center gap-2 text-xs'>
                      <Rss className='h-3 w-3' />
                      <span>
                        {formatDistanceToNow(item.subscribeAt, {
                          addSuffix: true,
                          locale: zhCN
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <div className='flex-shrink-0'>
                  {status === 'subscribed' && (
                    <button
                      onClick={() => handleDelete(item)}
                      className='text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full p-2 transition-colors'
                      aria-label='删除'
                    >
                      <Trash2 className='h-4 w-4' />
                    </button>
                  )}
                  {status === 'added' && (
                    <button
                      onClick={() => handlePlay(item)}
                      className='text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-full p-2 transition-colors'
                      aria-label='播放'
                    >
                      <PlayCircle className='h-4 w-4' />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {hasMore && (
        <div className="relative group">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className='w-full h-full'
          >
            {isExpanded ? (
              // 收起状态 - 简洁的卡片
              <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 hover:bg-muted/50 hover:border-muted-foreground/50 transition-all duration-300 min-h-75 flex items-center justify-center">
                <div className="text-center p-6">
                  <ChevronUp className='h-8 w-8 mx-auto mb-2 text-muted-foreground group-hover:text-foreground transition-colors' />
                  <p className='text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors'>
                    收起列表
                  </p>
                </div>
              </div>
            ) : (
              // 展开状态 - 模糊渐变效果
              <div className="relative overflow-hidden rounded-xl min-h-full">
                {/* 背景：模糊的影片封面堆叠效果 */}
                <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-primary/10 to-primary/5">
                  <div className="absolute inset-0 backdrop-blur-3xl bg-background/80" />
                </div>

                {/* 内容 */}
                <div className="relative h-full flex flex-col items-center justify-center p-8 text-center">
                  {/* 堆叠的卡片效果 */}
                  <div className="relative mb-6">
                    <div className="absolute -top-2 -left-2 w-16 h-20 bg-muted/40 rounded-lg transform -rotate-12 blur-sm" />
                    <div className="absolute -top-1 -right-2 w-16 h-20 bg-muted/40 rounded-lg transform rotate-12 blur-sm" />
                    <div className="relative w-16 h-20 bg-linear-to-br from-primary/20 to-primary/40 rounded-lg flex items-center justify-center">
                      <Film className='h-8 w-8 text-primary' />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className='text-2xl font-bold'>+{remainingCount}</p>
                    <p className='text-sm text-muted-foreground'>
                      点击查看更多影片
                    </p>
                  </div>

                  {/* 底部提示 */}
                  <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-px w-8 bg-muted-foreground/30" />
                    <span>展开</span>
                    <div className="h-px w-8 bg-muted-foreground/30" />
                  </div>
                </div>

                {/* Hover 效果 */}
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            )}
          </button>
        </div>
      )}
      <SimpleMovieDetailDialog
        movie={movieData}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
