"use client"
import { GlareCard } from "@/components/ui/glare-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SubscribeData } from "@prisma/client";
import { Calendar, Clock, Users, Download, Play, CheckCircle, Trash2,Rss, PlayCircle } from "lucide-react";
import { Property } from "@/types/javbus";
import { MovieDetailsTrigger } from "@/components/JAV/subscribe-detail-dialog-trigger";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
type pageProps = {
  subscribeMovieList: SubscribeData[];
  status: 'subscribed' | 'downloading' | 'downloaded' | 'added';
  mediaServer?: any;
};

export default function SubscribePosterWallPage(props: pageProps) {
  const { subscribeMovieList, status } = props;
  const router = useRouter();
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'subscribed':
        return <Play className="h-4 w-4 text-blue-500" />;
      case 'downloading':
        return <Download className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'downloaded':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'subscribed':
        return 'bg-blue-500';
      case 'downloading':
        return 'bg-yellow-500';
      case 'downloaded':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handlePlay = async (item: SubscribeData) => {
    if (!props.mediaServer || !props.mediaServer.publicAddress) {
      toast.error('媒体服务器配置未设置');
      return;
    }
    if (!item.mediaLibrary) {
      toast.error('媒体信息未设置');
    }
    const mediaInfo = item.mediaLibrary as any | null;
    
    const ml = `${props.mediaServer.publicAddress}/web/index.html#!/item?id=${mediaInfo.Id}&serverId=${mediaInfo.ServerId}`
    window.open(ml, '_blank');
  };

  const handleDelete = async (item: SubscribeData) => {
    const response = await fetch(`/api/movie/${item.code}/subscribe`, {
      method: 'DELETE',
    });
    if (response.ok) {
      toast.success('删除成功');
      router.refresh();
    } else {
      toast.error('删除失败');
    }
  };

  return (
    <div className="grid grid-cols-5 gap-4">
      {subscribeMovieList.map((item) => {
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
          <div key={item.code}>
            <MovieDetailsTrigger movieId={item.code || ''} showSubscribeButton={false}>
              {item.cover ? (
                <GlareCard className="w-full cursor-pointer hover:scale-105 transition-transform duration-200">
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


                    {/* ID Badge */}
                    <div className="absolute top-3 left-3">
                      <Badge variant="secondary" className="text-xs font-mono bg-black/70 text-white border-none">
                        {item.code}
                      </Badge>
                    </div>

                    {status === 'added' && item.subscribeId && (
                      <div className="absolute top-3 right-3">
                        <Badge variant="secondary" className="text-xs font-mono bg-black/70 text-white border-none flex items-center">
                          <Rss className="h-3 w-3 mr-1" />
                        </Badge>
                      </div>
                    )}

                    {/* 时长信息 */}
                    {videoLength && (
                      <div className="absolute bottom-3 right-3">
                        <Badge variant="secondary" className="text-xs bg-black/70 text-white border-none">
                          <Clock className="h-3 w-3 mr-1" />
                          {videoLength}分钟
                        </Badge>
                      </div>
                    )}
                  </div>
                </GlareCard>
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">无图片</span>
                </div>
              )}
            </MovieDetailsTrigger>


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

                  {/* 发行日期 */}
                  {item.date && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3" />
                      <span>{item.date}</span>
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
                  {
                    status === 'subscribed' && (
                      <button
                    onClick={()=>handleDelete(item)}
                    className="p-2 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    aria-label="删除"
                  >
                    {/* 假设使用 lucide-react 图标库 */}
                    <Trash2 className="h-4 w-4" />
                  </button>
                    )
                  } 
                  {
                    status === 'added' && (
                      
                      <button
                        onClick={()=>handlePlay(item)}
                        className="p-2 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        aria-label="播放"
                      >
                        <PlayCircle className="h-4 w-4" />
                      </button>
                    )
                  }
                  
                </div>

              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
}