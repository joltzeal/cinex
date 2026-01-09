'use client';
import { GlareCard } from '@/components/ui/glare-card';
import { Badge } from '@/components/ui/badge';
import { MovieDetailDialog } from '@/components/search/movie-detail-dialog';
import { formatDistanceToNow } from 'date-fns';
import {
  Clock,
  Users,
  Download,
  Trash2,
  Rss,
  PlayCircle,
  Film
} from 'lucide-react';
import { Property } from '@/types/javbus';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Movie } from '@prisma/client';
import { zhCN } from 'date-fns/locale';
import { useMediaServer } from '@/contexts/media-server-context';
type pageProps = {
  subscribeMovieList: Movie[];
  status: 'subscribed' | 'downloading' | 'downloaded' | 'added';
};

export default function SubscribePosterWallPage(props: pageProps) {
  const { subscribeMovieList, status } = props;
  const router = useRouter();

  const mediaServer = useMediaServer();

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

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-5'>
      {subscribeMovieList.map((item: any) => {
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

                      {/* ID Badge */}
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

                      {/* 时长信息 */}
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
              </MovieDetailDialog>
            ) : (
              <div className='bg-muted flex h-full w-full items-center justify-center'>
                <span className='text-muted-foreground text-sm'>无图片</span>
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

                {/* 3. 右侧删除按钮 */}
                <div className='flex-shrink-0'>
                  {status === 'subscribed' && (
                    <button
                      onClick={() => handleDelete(item)}
                      className='text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full p-2 transition-colors'
                      aria-label='删除'
                    >
                      {/* 假设使用 lucide-react 图标库 */}
                      <Trash2 className='h-4 w-4' />
                    </button>
                  )}
                  {status === 'added' && (
                    <button
                      onClick={() => handlePlay(item)}
                      className='text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full p-2 transition-colors'
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
    </div>
  );
}
