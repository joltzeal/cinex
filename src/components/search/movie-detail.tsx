"use client";
import { UserCircle, Building, Film, BookText, Copy, Download, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Magnet, MovieDetail } from "@/types/javbus";
import { useCallback, useMemo, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { useRouter } from "next/navigation";
import { MagnetPreviewDialog } from "../magnet-preview-dialog";
import { toast } from "sonner";
import { SseProgress } from "@/types";
import { useLoading } from "@/app/context/loading-context";
import { SubscribeData } from "@prisma/client";
import { SubscribeMovieStatusMap } from "@/constants/data";

// --- 定义组件的 Props 接口 ---
interface MovieDetailDisplayProps {
  movie: MovieDetail & { magnets?: Magnet[] };
  subscribeMovie: SubscribeData | null;
}


// --- 图片代理辅助函数 ---
const proxyImageUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  return `/api/subscribe/javbus/proxy?url=${encodeURIComponent(url)}`;
};

// --- 这是新的展示组件 ---
export default function MovieDetailDisplay({ movie, subscribeMovie }: MovieDetailDisplayProps) {

  const [taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState<SseProgress[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewingMagnet, setPreviewingMagnet] = useState<string | null>(null);
  const router = useRouter();
  const { showLoader, hideLoader, updateLoadingMessage } = useLoading();
  const listenToSse = useCallback((id: string) => {
    const eventSource = new EventSource(`/api/download/status/${id}`);

    eventSource.onopen = () => {
      updateLoadingMessage("已连接到服务器，等待任务开始...");
    };

    eventSource.onmessage = (event) => {
      try {
        const newProgress = JSON.parse(event.data);

        // 更新进度数组
        setProgress(prev => [...prev, newProgress]);

        // 更新 loader 的文本
        updateLoadingMessage(`[${newProgress.stage}] ${newProgress.message}`);

        if (newProgress.stage === 'CONNECTED') {
          updateLoadingMessage("连接已建立，等待任务开始...");
        } else if (newProgress.stage === 'DONE') {
          toast.success(newProgress.message || '所有任务处理完毕！');
          eventSource.close();
          hideLoader(); // 隐藏 loader
          setIsSubmitting(false);
          router.refresh();
        } else if (newProgress.stage === 'ERROR') {
          toast.error(newProgress.message || '任务处理时发生错误。');
          eventSource.close();
          hideLoader(); // 隐藏 loader
          setIsSubmitting(false);
        }
      } catch (error) {
        console.error('SSE 数据解析错误:', error);
        toast.error('接收进度数据时发生错误');
        eventSource.close();
        hideLoader();
        setIsSubmitting(false);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE 连接错误:', error);

      // 检查连接状态
      if (eventSource.readyState === EventSource.CLOSED) {
        toast.error('与服务器的进度连接已断开');
        hideLoader();
        setIsSubmitting(false);
      } else if (eventSource.readyState === EventSource.CONNECTING) {
        updateLoadingMessage("连接断开，正在重新连接...");
      }
    };

    return eventSource;
  }, [router, hideLoader, updateLoadingMessage]);
  // --- 所有交互处理函数都移到这里 ---
  const handleCopyId = () => {
    if (!movie) return;
    navigator.clipboard.writeText(movie.id);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };


  const handleCopyMagnet = (link: string) => {
    navigator.clipboard.writeText(link)
      .then(() => toast.success("磁力链接已复制!"))
      .catch(() => toast.error("复制失败"));
  };

  const handleSubscribeMovie = async (movie: MovieDetail) => {
    setIsSubmitting(true);
    try {
        const response = await fetch(`/api/movie/${movie.id}/subscribe`, {
            method: "POST",
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
            
            if (response.status === 400 && errorMessage.includes("already subscribed")) {
                toast.error("该影片已经订阅过了");
            } else if (response.status === 404) {
                toast.error("影片未找到");
            } else if (response.status >= 500) {
                toast.error("服务器错误，请稍后重试");
            } else {
                toast.error(`订阅失败: ${errorMessage}`);
            }
            return;
        }
        
        const result = await response.json();
        if (result.success) {
            toast.success("订阅成功！");
        } else {
            toast.error("订阅失败");
        }
    } catch (error) {
        console.error("订阅失败:", error);
        if (error instanceof Error) {
            if (error.name === 'NetworkError' || error.message.includes('fetch')) {
                toast.error("网络错误，请检查网络连接");
            } else {
                toast.error(`订阅失败: ${error.message}`);
            }
        } else {
            toast.error("订阅失败，请重试");
        }
    } finally {
        setIsSubmitting(false);
    }
};

  const handleDownloadMagnet = async (movie: MovieDetail, magnet: Magnet) => {
    if (!magnet) {
      toast.error("没有磁力链接");
      return;
    }

    // 重置状态
    setProgress([]);
    setTaskId(null);
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('title', movie.title ?? movie.id)
    formData.append("downloadURLs", JSON.stringify([magnet.link]));
    formData.append("downloadImmediately", 'true');
    const movieData: any = movie
    movieData.type = 'jav'
    formData.append('movie', JSON.stringify(movieData))

    // 🔥 关键：显示全屏 loading
    showLoader("正在提交下载任务...");

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "创建失败");
      }

      if (response.status === 202 && result.taskId) {
        // 异步任务启动，更新 loader 文本并开始监听
        setTaskId(result.taskId); // 设置 taskId
        updateLoadingMessage("任务已启动，正在连接服务器...");
        listenToSse(result.taskId);
        // **不隐藏 loader**，让 SSE 处理器来控制
      } else {
        // 同步创建成功
        hideLoader(); // 隐藏 loader
        toast.success(result.message || "文档创建成功！");
        router.refresh();
        setIsSubmitting(false);
      }
    } catch (error: any) {
      console.error('[Submit] 错误:', error);
      hideLoader(); // 隐藏 loader
      toast.error(`发生错误: ${error.message}`);
      setIsSubmitting(false); // 出错时解锁按钮
    }
  };

  const handleSimilarMovieClick = (id: string) => {
    router.push(`/dashboard/explore/search/${id}`);
  };

  // --- Lightbox 数据计算也移到这里 ---
  const slides = useMemo(() => {
    if (!movie?.samples) return [];
    return movie.samples.map(sample => ({
      src: proxyImageUrl(sample.src)
    }));
  }, [movie?.samples]);

  const BANNER_HEIGHT_CLASS = "h-[380px]";

  // --- 完整的 JSX 渲染逻辑都移到这里 ---
  return (
    <ScrollArea className='h-[calc(100dvh-62px)] bg-background text-foreground'>
      {/* --- Banner & 头部信息 --- */}
      <section className={`relative w-full overflow-hidden mb-4 ${BANNER_HEIGHT_CLASS}`}>
        <img
          src={proxyImageUrl(movie.img)}
          alt="Banner"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        <div className="container mx-auto px-4 h-full relative">
          <div className="absolute bottom-8 left-0 right-0 px-4 flex items-end">
            {/* 2. 调整 Poster 尺寸和宽高比以适应横图 */}
            <div className="flex-shrink-0 w-72 -mb-8"> {/* 增加宽度，减少负边距 */}
              <img
                src={proxyImageUrl(movie.img)}
                alt="Poster"
                // 关键：修改为横向宽高比
                className="rounded-md shadow-lg w-full h-auto aspect-[800/538] object-cover bg-muted/20"
              />
            </div>
            <div className="ml-6 flex-grow pb-4">
              <h1 className="text-2xl md:text-4xl font-bold line-clamp-2">
                {movie.title}
              </h1>
              <div
                onClick={handleCopyId}
                className="flex items-center text-muted-foreground mt-2 cursor-pointer group w-fit"
              >
                <span className="text-lg font-semibold tracking-wider">{isCopied ? '已复制!' : movie.id}</span>
                <Copy className={`w-4 h-4 ml-2 transition-opacity ${isCopied ? 'opacity-0' : 'opacity-50 group-hover:opacity-100'}`} />
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {movie.stars.map(star => (
                  <Badge key={star.id} variant="outline" className="text-md">
                    <UserCircle className="w-4 h-4 mr-1.5" />
                    {star.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- 主内容区 --- */}
      <div className="container mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          <main className="lg:col-span-7">
            <section className="mt-12 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-lg bg-card/50 p-4">
                <div className="text-center md:text-left">
                  <p className="text-sm text-muted-foreground">发行日期</p>
                  <p className="text-lg font-semibold">{movie.date ?? 'N/A'}</p>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-sm text-muted-foreground">影片时长</p>
                  <p className="text-lg font-semibold">{movie.videoLength ? `${movie.videoLength}分钟` : 'N/A'}</p>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-sm text-muted-foreground">导演</p>
                  <p className="text-lg font-semibold">{movie.director?.name ?? 'N/A'}</p>
                </div>
              </div>
            </section>
            <section className="mt-16 mb-8 space-y-10">
              {/* --- 标签 (Genres) --- */}
              <div>
                <h2 className="text-2xl font-bold mb-4">标签</h2>
                <div className="flex flex-wrap gap-2">
                  {movie.genres.map((genre) => (
                    <Badge key={genre.id} variant="secondary">{genre.name}</Badge>
                  ))}
                </div>
              </div>

              {/* --- 剧照 (Samples) --- */}
              <div>
                <h2 className="text-2xl font-bold mb-4">剧照</h2>
                <ScrollArea className="w-full whitespace-nowrap rounded-lg">
                  <div className="flex w-max space-x-4 pb-4">
                    {movie.samples.map((sample, index) => (
                      <figure key={sample.id} className="shrink-0">
                        <img
                          src={proxyImageUrl(sample.src)} // 使用缩略图以加快加载
                          alt={sample.alt ?? ''}
                          className="h-48 w-auto rounded-md object-contain bg-muted/20 cursor-pointer hover:opacity-80 transition-opacity"
                          // 4. 添加点击事件
                          onClick={() => {
                            setLightboxIndex(index);
                            setLightboxOpen(true);
                          }}
                        />
                      </figure>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>

              {/* --- 相似影片 --- */}
              <div>
                <h2 className="text-2xl font-bold mb-4">相似影片</h2>
                <ScrollArea className="w-full whitespace-nowrap rounded-lg">
                  {/* 3. 使用 Flexbox 容器来排列所有项目 */}
                  <div className="flex w-max space-x-4 p-1">
                    {movie.similarMovies.map((similar) => (
                      // 4. 定义每个可点击的项目
                      <div
                        key={similar.id}
                        onClick={() => handleSimilarMovieClick(similar.id)}
                        className="group w-36 cursor-pointer space-y-2" // 核心: 使用固定宽度
                      >
                        <div className="overflow-hidden rounded-md">
                          <img
                            src={proxyImageUrl(similar.img)}
                            alt={similar.title}
                            className="w-full aspect-[2/3] bg-muted/20 object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                          />
                        </div>
                        <p className="text-xs text-center text-muted-foreground truncate">
                          {similar.title}
                        </p>
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            </section>
          </main>

          {/* --- 右侧边栏 --- */}
          <aside className="lg:col-span-3">
            <div className="sticky top-8 space-y-6">
              <div className="relative">
                {!subscribeMovie && (
                  <Button variant="default" onClick={() => handleSubscribeMovie(movie)} disabled={isSubmitting}>
                    {isSubmitting ? '正在订阅...' : '添加订阅'}
                  </Button>
                )}
              
                {
                  ['downloading', 'downloaded', 'subscribed', 'added'].includes(subscribeMovie?.status as string) && (
                    <Button variant={SubscribeMovieStatusMap[subscribeMovie?.status as keyof typeof SubscribeMovieStatusMap].variant as any}>{SubscribeMovieStatusMap[subscribeMovie?.status as keyof typeof SubscribeMovieStatusMap].label}</Button>
                  )
                }
              </div>
              <Card className="bg-card border-border">
                <CardContent className="p-4 space-y-3">
                  {[
                    { icon: <Film className="w-4 h-4 mr-2 text-muted-foreground" />, key: "制作商", value: movie.producer?.name },
                    { icon: <Building className="w-4 h-4 mr-2 text-muted-foreground" />, key: "发行商", value: movie.publisher?.name },
                    { icon: <BookText className="w-4 h-4 mr-2 text-muted-foreground" />, key: "系列", value: movie.series?.name },
                  ].map(({ icon, key, value }) => (
                    value ? (
                      <div key={key} className="flex items-center justify-between text-sm font-medium border-b border-border/50 pb-2 last:border-b-0 last:pb-0" >
                        <div className="flex items-center">
                          {icon}
                          <p className="text-muted-foreground">{key}</p>
                        </div>
                        <p className="text-right">{value}</p>
                      </div>
                    ) : null
                  ))}
                </CardContent>
              </Card>
              {movie.magnets && (
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>资源下载</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[400px]">
                      {/* 2. 在表格外层包裹 TooltipProvider */}
                      <TooltipProvider>
                        {/* 3. 使用 table-fixed 强制执行列宽 */}
                        <Table className="table-fixed w-full">
                          <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                            <TableRow>
                              {/* 标题列自动填充剩余空间 */}
                              <TableHead>标题</TableHead>
                              {/* 4. 为右侧列设置固定宽度 */}
                              <TableHead className="w-24 text-right">大小</TableHead>
                              <TableHead className="w-32 text-center">操作</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {movie.magnets?.map((magnet) => (
                              <TableRow key={magnet.id}>
                                {/* 5. 实现标题列的 Tooltip 和截断 */}
                                <TableCell className="py-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-2 overflow-hidden">
                                        <div className="flex-shrink-0 flex items-center gap-1">
                                          {magnet.isHD && <Badge variant="destructive" className="px-1.5 py-0 text-xs">HD</Badge>}
                                          {magnet.hasSubtitle && <Badge variant="outline" className="px-1.5 py-0 text-xs border-amber-500 text-amber-500">字幕</Badge>}
                                        </div>
                                        <p className="truncate" title="">
                                          {magnet.title ?? magnet.link}
                                        </p>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{magnet.title ?? magnet.link}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TableCell>
                                <TableCell className="text-right whitespace-nowrap py-2">{magnet.size}</TableCell>
                                <TableCell className="text-center space-x-1 py-2">
                                  <Button variant="ghost" size="icon" onClick={() => handleCopyMagnet(magnet.link)} title="复制磁力链接">
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" title="预览" onClick={() => setPreviewingMagnet(magnet.link)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="下载"
                                    onClick={() => handleDownloadMagnet(movie, magnet)}
                                    disabled={isSubmitting}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TooltipProvider>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          </aside>
        </div>
      </div>
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={slides}
        index={lightboxIndex}
      // 可选：添加更多插件和配置
      />
      <MagnetPreviewDialog
        magnetLink={previewingMagnet}
        open={!!previewingMagnet}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setPreviewingMagnet(null);
          }
        }}
      />
    </ScrollArea>
  );
}