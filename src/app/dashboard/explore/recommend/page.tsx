"use client"
import React, { useState, useEffect, useRef } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Minus, AppWindow, Star, Users, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils'; // 确保您有这个 cn 工具函数
import PageContainer from '@/components/layout/page-container';
import { useRouter } from 'next/navigation';
import { useMovieStore } from '@/store/useMovieStore';
import { toast } from 'sonner';
import { useLoading } from '@/app/context/loading-context';
import { VideoInfo } from '@/types/javdb';

// 1. 基础组件定义 (从您的需求中提供)
// =======================================================================

interface JAVDBResponse {
  success: boolean;
  data?: VideoInfo[];
  error?: string;
}

interface RankingSectionProps {
  title: string;
  url: string;
  columns: number;
  aspectRatio: string;
}

/**
 * 单个海报卡片组件
 */
function PosterCard({ video, aspectRatioValue }: { video: VideoInfo; aspectRatioValue: number }) {
  const setCurrentMovie = useMovieStore((state) => state.setCurrentMovie);
  const router = useRouter();
  const { showLoader, hideLoader, updateLoadingMessage } = useLoading();
  const handleVideoClick = async (code: string) => {
    showLoader(`正在获取番号 "${code}" 的相关信息...`);
    try {
      const response = await fetch(`/api/movie/${code}`);

      if (!response.ok) {

        if (response.status === 404) {
          toast.error(`未找到番号 "${code}" 的相关信息`);
          throw new Error(`未找到番号 "${code}" 的相关信息`);
        } else {
          toast.error(`请求失败，状态码: ${response.status}`);
          throw new Error(`请求失败，状态码: ${response.status}`);
        }
      }

      const result = await response.json(); // 获取返回的 JSON 数据


      // // 2. 关键改动：将获取到的数据存入 Zustand Store
      if (result && result.data) {
        setCurrentMovie(result.data);
      } else {
        // 如果 API 成功但没有返回有效数据，也抛出错误
        toast.error("数据格式不正确");
        throw new Error("API 返回的数据格式不正确");
      }
      router.push(`/dashboard/explore/search/${code}`);
    } catch (error) {

    } finally {
      hideLoader();
    }
  };
  return (
    // 控制卡片之间的间距
    <div className="p-1.5 cursor-pointer" onClick={() => handleVideoClick(video.code!)}>
      <div className="group relative overflow-hidden rounded-lg">
        <AspectRatio ratio={aspectRatioValue}>
          <img
            src={video.cover || '/placeholder.png'}
            alt={video.code || 'Poster'} // 使用 code 作为图片的 alt 文本
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </AspectRatio>

        {/* 左上角: Code */}
        {video.code && (
          <div className="absolute top-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
            {video.code}
          </div>
        )}

        {/* 右上角: 评分 */}
        {video.score && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
            <Star className="h-3 w-3 text-yellow-400" fill="currentColor" />
            <span>{video.score.toFixed(1)}</span>
          </div>
        )}

        {/* 左下角: 评论数 */}
        {video.reviews && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
            <Users className="h-3 w-3" />
            <span>{video.reviews}人评价</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 加载时的骨架屏组件
 */
function PosterSkeleton({
  columns,
  aspectRatioValue
}: {
  columns: number;
  aspectRatioValue: number;
}) {
  return (
    <div className="w-full">
      <Skeleton className="mb-4 h-8 w-48" />
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {Array.from({ length: columns }).map((_, index) => (
          <div key={index} className="p-1.5">
            <AspectRatio ratio={aspectRatioValue}>
              <Skeleton className="h-full w-full rounded-lg" />
            </AspectRatio>
          </div>
        ))}
      </div>
    </div>
  );
}
/**
 * 核心组件：海报行
 * 负责获取数据、切换模式（行/宫格）、滚动等
 */
function PosterRow({ title, url, columns, aspectRatio }: RankingSectionProps) {
  const [videos, setVideos] = useState<VideoInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // useRef 用于获取滚动容器的 DOM 元素
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  const [numerator, denominator] = aspectRatio.split('/').map(Number);
  const aspectRatioValue = numerator / (denominator || 1);

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(url);
            // 【改动 2】: 无论请求是否成功，都尝试解析JSON，因为错误信息也在响应体中
            const res: JAVDBResponse = await response.json();

            if (!response.ok) {
                // 如果API返回了具体的错误信息，则使用它，否则使用通用的HTTP状态错误
                throw new Error(res.error || `请求失败，状态码: ${response.status}`);
            }

            const data = res.data || [];
            setVideos(data);
        } catch (e) {
            // 【改动 3】: 将捕获到的错误消息存入 state
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError('发生未知错误');
            }
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
}, [url]);

  // 【修复】使用 useEffect 绑定滚轮事件，更稳定可靠
  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      // 如果有横向滚动条，则阻止页面默认的垂直滚动行为
      if (viewport.scrollWidth > viewport.clientWidth) {
        e.preventDefault();
        viewport.scrollLeft += e.deltaY;
      }
    };

    viewport.addEventListener('wheel', handleWheel);
    return () => viewport.removeEventListener('wheel', handleWheel);
  }, [isLoading]); // 当数据加载完成后，重新绑定事件

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollViewportRef.current) {
      // 每次滚动一个视口的宽度
      const scrollAmount = scrollViewportRef.current.clientWidth;
      scrollViewportRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (isLoading) {
    return <PosterSkeleton columns={columns} aspectRatioValue={aspectRatioValue} />;
  }

  return (
    <section>
        <div className="mb-4 flex items-center justify-between">
            <h2
                className="cursor-pointer text-2xl font-bold transition-colors hover:text-primary"
                onClick={() => videos.length > 0 && setIsExpanded(!isExpanded)} // 只有在有数据时才响应点击
            >
                {title}
            </h2>
            {/* 只有在没有错误且有视频时，才显示切换和滚动按钮 */}
            {!error && videos.length > 0 && (
                <div className="flex items-center gap-2">
                    {!isExpanded && (
                        <>
                            <Button variant="outline" size="icon" onClick={() => handleScroll('left')}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => handleScroll('right')}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                    <Button variant="outline" size="icon" onClick={() => setIsExpanded(!isExpanded)}>
                        {isExpanded ? <Minus className="h-4 w-4" /> : <AppWindow className="h-4 w-4" />}
                    </Button>
                </div>
            )}
        </div>

        {/* 【改动 5】: 在标题下方渲染错误信息 */}
        {error ? (
            <div className="flex items-center gap-x-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p>{error}</p>
            </div>
        ) : videos.length === 0 ? (
            // 如果没有错误但视频数组为空，可以显示一个提示
            <div className="text-sm text-muted-foreground">
                此榜单下暂无内容。
            </div>
        ) : isExpanded ? (
            // 宫格模式 (展开)
            <div className="grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                {videos.map((video) => (
                    <PosterCard key={video.code || video.title} video={video} aspectRatioValue={aspectRatioValue} />
                ))}
            </div>
        ) : (
            // 行模式 (收起)
            <ScrollArea className="w-full">
                <div ref={scrollViewportRef} className="flex overflow-x-auto pb-4" style={{ scrollbarWidth: 'none', 'msOverflowStyle': 'none' } as React.CSSProperties}>
                    {videos.map((video) => (
                        <div
                            key={video.code || video.title}
                            style={{ flex: `0 0 calc(100% / ${columns})` }}
                        >
                            <PosterCard video={video} aspectRatioValue={aspectRatioValue} />
                        </div>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" className="mt-2" />
            </ScrollArea>
        )}
    </section>
);
}


// 4. 主页面组件
// =======================================================================

export default function RecommendPage() {
  const rankingSections: RankingSectionProps[] = [
    { title: 'JavDB日榜', url: '/api/movie/rankings?website=javdb&period=daily', columns: 5, aspectRatio: '1.48/1' },
    { title: 'JavDB周榜', url: '/api/movie/rankings?website=javdb&period=weekly', columns: 5, aspectRatio: '1.48/1' },
    { title: 'JavDB月榜', url: '/api/movie/rankings?website=javdb&period=monthly', columns: 5, aspectRatio: '1.48/1' },
    { title: 'AVFAN周榜', url: '/api/movie/rankings?website=avfan&period=weekly', columns: 5, aspectRatio: '1.48/1' },
    { title: 'AVFAN月榜', url: '/api/movie/rankings?website=avfan&period=monthly', columns: 5, aspectRatio: '1.48/1' },
    { title: 'OneJav周榜', url: '/api/movie/rankings?website=onejav&period=7', columns: 5, aspectRatio: '1.48/1' },
    { title: 'OneJav月榜', url: '/api/movie/rankings?website=onejav&period=30', columns: 5, aspectRatio: '1.48/1' },

  ];

  return (
    <PageContainer scrollable={true}>
      <div className="w-full">
        <h1 className="mb-6 border-b pb-4 text-3xl font-bold">推荐榜单</h1>
        <div className="flex flex-col gap-6">
          {rankingSections.map((section) => (
            <PosterRow
              key={section.title}
              title={section.title}
              url={section.url}
              columns={section.columns}
              aspectRatio={section.aspectRatio}
            />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}