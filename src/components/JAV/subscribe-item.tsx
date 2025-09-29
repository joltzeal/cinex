'use client';

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Prisma, SubscribeData, SubscribeMovieStatus } from "@prisma/client";
import { Bookmark, Building, Clapperboard, Film, PlayCircle, Tag, User, Trash2 } from "lucide-react"; // 1. 导入新图标
import { LazyImage } from "../LazyImage";
import { Badge } from "../ui/badge";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import { MovieDetailsTrigger } from "./subscribe-detail-dialog-trigger";
import { JellyfinMediaItem } from "@/lib/jellyfin-client";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { useState, useRef, useEffect } from "react";

type SubscribeWithMovies = Prisma.SubscribeJAVBusGetPayload<{
  include: { movies: true };
}>;

const statusMap: { [key in SubscribeMovieStatus]: { label: string | null; variant: "default" | "secondary" | "destructive" | "outline" } } = {
  // 这些状态将不会显示 Badge
  uncheck: { label: null, variant: 'secondary' },
  checked: { label: null, variant: 'outline' },
  undownload: { label: null, variant: 'outline' },
  // 只有这些状态会显示 Badge
  downloading: { label: '下载中', variant: 'default' },
  downloaded: { label: '已完成', variant: 'default' }, // "已下载" 改为 "已完成" 更简洁
  added: { label: '已入库', variant: 'destructive' },
  subscribed: { label: '已订阅', variant: 'default' },
  transfered: { label: '已转移', variant: 'default' },
};
const filterTypeMap = {
  genre: { label: '类别', icon: Tag },
  director: { label: '导演', icon: User },
  studio: { label: '制作商', icon: Building },
  label: { label: '发行商', icon: Film },
  series: { label: '系列', icon: Clapperboard },
  star: { label: '演员', icon: User } // 'star' 应该总是有 starInfo，但作为备用
};
export default function JavbusSubscribeInfoItem({ info, mediaServer }: { info: SubscribeWithMovies, mediaServer: MediaServerConfig }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // 使用原生事件监听器来更好地控制滚轮事件
  useEffect(() => {
    const scrollAreaElement = scrollAreaRef.current;
    if (!scrollAreaElement) return;

    const handleNativeWheel = (e: WheelEvent) => {
      const scrollContainer = scrollAreaElement.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        const canScrollHorizontally = scrollContainer.scrollWidth > scrollContainer.clientWidth;
        
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
    window.open(`https://www.javbus.com/${filter.type}/${filter.value}`, "_blank");
  };


  const handleDelete = async () => {
    setIsDeleting(true);
    setShowDeleteDialog(false);

    try {
      const response = await fetch(`/api/subscribe/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscribeId: info.id
        }),
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
  if (info.starInfo && typeof info.starInfo === 'object' && 'name' in info.starInfo) {
    // A. 渲染 Star Info

    const star = info.starInfo as any;
    const proxiedAvatarSrc = star.avatar
      ? `/api/subscribe/javbus/proxy?url=${encodeURIComponent(star.avatar)}`
      : "";

    headerContent = (
      <div className="flex justify-between">
        <div className="flex items-start space-x-3">
          <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0">
            <LazyImage
              src={proxiedAvatarSrc}
              alt={star.name || "Star"}
              className="w-full h-full object-cover"
              fallbackText="No Avatar"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 style={{ cursor: 'pointer' }} className="font-semibold text-foreground truncate hover:underline decoration-2 underline-offset-2"  onClick={() => handleFilterClick(info.filter)}>{star.name || "Unknown Star"}</h3>
            {star.birthday && (<p className="text-sm text-muted-foreground">{star.birthday}</p>)}
          </div>
        </div>
      </div>
    );
  } else if (info.filter && typeof info.filter === 'object' && 'type' in info.filter && 'name' in info.filter) {


    // B. 回退到渲染 Filter Info
    const filter = info.filter as any;
    const filterMapping = filterTypeMap[filter.type as keyof typeof filterTypeMap] || { label: filter.type, icon: Bookmark };
    const Icon = filterMapping.icon;


    headerContent = (
      <div className="flex justify-between">
        <div className="flex items-start space-x-3">
          <div className="relative w-12 h-12 rounded-lg flex items-center justify-center bg-muted flex-shrink-0">
            <Icon className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-foreground truncate hover:underline decoration-2 underline-offset-2"
              title={filter.name}
              onClick={() => handleFilterClick(filter)}
              style={{ cursor: 'pointer' }}
            >
              {filter.name}
            </h3>
            <p className="text-sm text-muted-foreground">{filterMapping.label}</p>

          </div>
        </div>
      </div>
    );
  } else {
    headerContent = (
      <div className="flex justify-between">
        <h3 className="font-semibold text-foreground">未知订阅</h3>
      </div>
    );
  }
  return (
    <Card className="w-full table table-fixed">
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between">
          {/* 4. 渲染动态生成的 headerContent */}
          <div className="flex-1 min-w-0">
            {headerContent}
          </div>
          {/* 更新时间 Badge 和删除按钮 */}
          <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
            <div className="flex flex-col space-y-1 items-end">
            <Badge variant="default">
              {info.movies.length} 部影片
            </Badge>
            <Badge variant="outline">
              更新时间：{new Date(info.updatedAt).toLocaleDateString()}
            </Badge>
            </div>
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  title="删除订阅"
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4" />
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
                  <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? '删除中...' : '确认删除'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-0">
        <ScrollArea 
          ref={scrollAreaRef}
          className="w-full whitespace-nowrap rounded-md"
        >
          <div className="flex w-max space-x-4 p-4">
            {info.movies.map((movie: SubscribeData) => { // 明确 movie 类型
              const proxiedSrc = movie.poster
                ? `/api/subscribe/javbus/proxy?url=${encodeURIComponent(movie.poster)}`
                : "";

              if (!movie.code) return null;

              // 4. 从映射中获取当前状态的配置
              const statusConfig = statusMap[movie.status as SubscribeMovieStatus] || statusMap.uncheck;
              const mediaInfo = movie.mediaLibrary as JellyfinMediaItem | null;
              return (
                <MovieDetailsTrigger key={movie.id} movieId={movie.code} showSubscribeButton={false}>
                  <div className="flex flex-col items-center space-y-2 w-[100px] flex-shrink-0 cursor-pointer group">
                    <div className="relative w-full h-[150px] rounded-md overflow-hidden bg-muted">
                      <LazyImage src={proxiedSrc}
                        alt={movie.title} className="w-full h-full object-cover" />

                      {/* 5. 添加状态 Badge */}
                      {statusConfig && statusConfig.label && (
                        <Badge
                          variant={statusConfig.variant}
                          // 3. 调整 Badge 样式
                          className="absolute top-1.5 right-1.5 text-[10px] h-4 px-1.5 font-semibold backdrop-blur-sm"
                        >
                          {statusConfig.label}
                        </Badge>
                      )}
                      {movie.status === 'added' && mediaInfo && (
                        <a
                          href={`${mediaServer.publicAddress}/web/index.html#!/item?id=${mediaInfo.Id}&serverId=${mediaInfo.ServerId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          // 阻止点击事件冒泡到父级的 MovieDetailsTrigger
                          onClick={(e) => e.stopPropagation()}

                          className="absolute bottom-1.5 right-1.5 z-10 cursor-pointer"
                        >
                          <Button variant="ghost" size="icon" className="h-7 w-7  bg-black/50 text-white hover:bg-black/70 hover:text-white">
                            <PlayCircle className="h-5 w-5" />
                          </Button>
                        </a>
                      )}
                    </div>
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="w-full text-center text-xs text-foreground truncate leading-tight group-hover:text-primary">
                            {movie.code}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent><p className="max-w-xs">{movie.title}</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <p className="text-xs text-muted-foreground truncate leading-tight">{movie.date}</p>
                  </div>
                </MovieDetailsTrigger>
              )
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}