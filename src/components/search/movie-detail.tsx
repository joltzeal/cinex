'use client';
import {
  UserCircle,
  Building,
  MessageCircleCode,
  Film,
  BookText,
  Copy,
  Download,
  Eye,
  PlayCircle,
  Star
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Magnet, MovieDetail } from '@/types/javbus';
import { useCallback, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MagnetPreviewDialog } from '@/components/magnet/magnet-preview-dialog';
import { toast } from 'sonner';
import { SseProgress } from '@/types';
// import { useLoading } from "@/contexts/loading-context";
import { Movie, MovieStatus } from '@prisma/client';
import { SubscribeMovieStatusMap } from '@/constants/data';
// import { useGlobalLightbox } from "@/components/global-lightbox-provider";
import { useMediaServer } from '@/contexts/media-server-context';
import { MovieReviewDialog } from '@/components/jav/movie-review';

// --- 定义组件的 Props 接口 ---
interface MovieDetailDisplayProps {
  movie: Movie;
}

// --- 图片代理辅助函数 ---
const proxyImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  return `/api/subscribe/javbus/proxy?url=${encodeURIComponent(url)}`;
};

// --- 这是新的展示组件 ---
export default function MovieDetailDisplay({ movie }: MovieDetailDisplayProps) {
  const mediaServer = useMediaServer();
  const movieDetail = {
    ...(movie.detail as unknown as MovieDetail),
    magnets: movie.magnets as unknown as Magnet[]
  };
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  const [progress, setProgress] = useState<SseProgress[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewingMagnet, setPreviewingMagnet] = useState<string | null>(null);
  const router = useRouter();
  // const { showLoader, hideLoader, updateLoadingMessage } = useLoading();
  // const { openLightbox } = useGlobalLightbox();
  const handleOpenReviewDialog = () => {
    setIsReviewDialogOpen(true);
  };
  const handleSubmitReview = async (data: {
    rating: string;
    comment: string;
    tags: string[];
  }) => {
    console.log(data);
    try {
      const response = await fetch(`/api/movie/${movieDetail.id}/reviews`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error('提交评价失败');
      }
      const result = await response.json();
      if (result.success) {
        toast.success('提交评价成功');
      } else {
        toast.error('提交评价失败');
      }
    } catch (error) {
      console.error('提交评价失败:', error);
      toast.error('提交评价失败');
    }
  };

  const handleCloseReviewDialog = () => {
    setIsReviewDialogOpen(false);
  };
  const handleClickMetaInfo = (type: string, value: any) => {
    const javbusUrl = `https://www.javbus.com/${type}/${value.id}`;
    window.open(javbusUrl, '_blank');
  };

  const lightboxSlides = useMemo(() => {
    return movieDetail.samples.map((sample: any) => ({
      src: proxyImageUrl(sample.src),
      alt: sample.alt ?? ''
    }));
  }, [movieDetail.samples]);
  // const listenToSse = useCallback((id: string) => {
  //   const eventSource = new EventSource(`/api/download/status/${id}`);

  //   eventSource.onopen = () => {
  //     updateLoadingMessage("已连接到服务器，等待任务开始...");
  //   };

  //   eventSource.onmessage = (event) => {
  //     try {
  //       const newProgress = JSON.parse(event.data);

  //       // 更新进度数组
  //       setProgress(prev => [...prev, newProgress]);

  //       // 更新 loader 的文本
  //       updateLoadingMessage(`[${newProgress.stage}] ${newProgress.message}`);

  //       if (newProgress.stage === 'CONNECTED') {
  //         updateLoadingMessage("连接已建立，等待任务开始...");
  //       } else if (newProgress.stage === 'DONE') {
  //         toast.success(newProgress.message || '所有任务处理完毕！');
  //         eventSource.close();
  //         // hideLoader(); // 隐藏 loader
  //         setIsSubmitting(false);
  //         router.refresh();
  //       } else if (newProgress.stage === 'ERROR') {
  //         toast.error(newProgress.message || '任务处理时发生错误。');
  //         eventSource.close();
  //         // hideLoader(); // 隐藏 loader
  //         setIsSubmitting(false);
  //       }
  //     } catch (error) {
  //       console.error('SSE 数据解析错误:', error);
  //       toast.error('接收进度数据时发生错误');
  //       eventSource.close();
  //       // hideLoader();
  //       setIsSubmitting(false);
  //     }
  //   };

  //   eventSource.onerror = (error) => {
  //     console.error('SSE 连接错误:', error);

  //     // 检查连接状态
  //     if (eventSource.readyState === EventSource.CLOSED) {
  //       toast.error('与服务器的进度连接已断开');
  //       // hideLoader();
  //       setIsSubmitting(false);
  //     } else if (eventSource.readyState === EventSource.CONNECTING) {
  //       updateLoadingMessage("连接断开，正在重新连接...");
  //     }
  //   };

  //   return eventSource;
  // }, [router, hideLoader, updateLoadingMessage]);
  // --- 所有交互处理函数都移到这里 ---
  const handleCopyId = () => {
    if (!movieDetail) return;
    navigator.clipboard.writeText(movieDetail.id);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopyMagnet = (link: string) => {
    navigator.clipboard
      .writeText(link)
      .then(() => toast.success('磁力链接已复制!'))
      .catch(() => toast.error('复制失败'));
  };

  const handleSubscribeMovie = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/movie/${movieDetail.id}/subscribe`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error || `HTTP ${response.status}: ${response.statusText}`;

        if (response.status === 400 && errorMessage.includes('影片已订阅')) {
          toast.error('该影片已经订阅过了');
        } else if (response.status === 404) {
          toast.error('影片未找到');
        } else if (response.status >= 500) {
          toast.error('服务器错误，请稍后重试');
        } else {
          toast.error(`订阅失败: ${errorMessage}`);
        }
        return;
      }

      const result = await response.json();
      if (result.success) {
        toast.success('订阅成功！');
        movie.status = MovieStatus.subscribed;
        // movieDetail.status = 'subscribed';
      } else {
        toast.error('订阅失败');
      }
    } catch (error) {
      console.error('订阅失败:', error);
      if (error instanceof Error) {
        if (error.name === 'NetworkError' || error.message.includes('fetch')) {
          toast.error('网络错误，请检查网络连接');
        } else {
          toast.error(`订阅失败: ${error.message}`);
        }
      } else {
        toast.error('订阅失败，请重试');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadMagnet = async (movie: MovieDetail, magnet: Magnet) => {
    if (!magnet) {
      toast.error('没有磁力链接');
      return;
    }

    // 重置状态
    setProgress([]);
    setTaskId(null);
    setIsSubmitting(true);
    console.log(movie.title);
    console.log(magnet.link);

    const formData = new FormData();
    formData.append('title', movie.title ?? movie.id);
    formData.append('downloadURLs', JSON.stringify([magnet.link]));
    formData.append('downloadImmediately', 'true');
    const movieData: any = movie;
    movieData.type = 'jav';
    formData.append('movie', JSON.stringify(movieData));

    // 🔥 关键：显示全屏 loading
    // showLoader("正在提交下载任务...");

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || '创建失败');
      }

      if (response.status === 202 && result.taskId) {
        // 异步任务启动，更新 loader 文本并开始监听
        setTaskId(result.taskId); // 设置 taskId
        // updateLoadingMessage("任务已启动，正在连接服务器...");
        // listenToSse(result.taskId);
        // **不隐藏 loader**，让 SSE 处理器来控制
      } else {
        // 同步创建成功
        // hideLoader(); // 隐藏 loader
        toast.success(result.message || '文档创建成功！');
        router.refresh();
        setIsSubmitting(false);
      }
    } catch (error: any) {
      console.error('[Submit] 错误:', error);
      // hideLoader(); // 隐藏 loader
      toast.error(`发生错误: ${error.message}`);
      setIsSubmitting(false); // 出错时解锁按钮
    }
  };

  const handleSimilarMovieClick = (id: string) => {
    router.push(`/dashboard/explore/search/${id}`);
  };

  const BANNER_HEIGHT_CLASS = 'h-[380px]';

  // --- 完整的 JSX 渲染逻辑都移到这里 ---
  return (
    <div className='rounded-lg'>
      <ScrollArea className='bg-background text-foreground h-[calc(100dvh-62px)] rounded-lg'>
        {/* --- Banner & 头部信息 --- */}
        <section
          className={`relative mb-4 w-full overflow-hidden ${BANNER_HEIGHT_CLASS}`}
        >
          <img
            src={proxyImageUrl(movieDetail.img)}
            alt='Banner'
            className='absolute inset-0 h-full w-full object-cover'
          />
          <div className='from-background via-background/80 absolute inset-0 bg-gradient-to-t to-transparent' />
          <div className='relative container mx-auto h-full px-4'>
            <div className='absolute right-0 bottom-8 left-0 flex items-end px-4'>
              {/* 2. 调整 Poster 尺寸和宽高比以适应横图 */}
              <div className='-mb-8 w-72 flex-shrink-0'>
                {' '}
                {/* 增加宽度，减少负边距 */}
                <img
                  src={proxyImageUrl(movieDetail.img)}
                  alt='Poster'
                  // 关键：修改为横向宽高比
                  className='bg-muted/20 aspect-[800/538] h-auto w-full rounded-md object-cover shadow-lg'
                />
              </div>
              <div className='ml-6 flex-grow pb-4'>
                <a
                  className='line-clamp-2 cursor-pointer text-2xl font-bold underline-offset-2 hover:underline md:text-4xl'
                  href={`https://www.javbus.com/${movieDetail.id}`}
                  target='_blank'
                >
                  {movieDetail.title}
                </a>
                <div
                  onClick={handleCopyId}
                  className='text-muted-foreground group mt-2 flex w-fit cursor-pointer items-center'
                >
                  <span className='text-lg font-semibold tracking-wider'>
                    {isCopied ? '已复制!' : movieDetail.id}
                  </span>
                  <Copy
                    className={`ml-2 h-4 w-4 transition-opacity ${isCopied ? 'opacity-0' : 'opacity-50 group-hover:opacity-100'}`}
                  />
                </div>
                <div className='mt-4 flex flex-wrap gap-2'>
                  {movieDetail.stars.map((star) => (
                    <Badge
                      key={star.id}
                      variant='outline'
                      className='text-md cursor-pointer'
                      onClick={() => handleClickMetaInfo('star', star)}
                    >
                      <UserCircle className='mr-1.5 h-4 w-4' />
                      {star.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- 主内容区 --- */}
        <div className='container mx-auto px-4 pb-8'>
          <div className='grid grid-cols-1 gap-8 lg:grid-cols-10'>
            <main className='lg:col-span-7'>
              <section className='mt-12 mb-8'>
                <div className='bg-card/50 grid grid-cols-1 gap-4 rounded-lg p-4 md:grid-cols-3'>
                  <div className='text-center md:text-left'>
                    <p className='text-muted-foreground text-sm'>发行日期</p>
                    <p className='text-lg font-semibold'>
                      {movieDetail.date ?? 'N/A'}
                    </p>
                  </div>
                  <div className='text-center md:text-left'>
                    <p className='text-muted-foreground text-sm'>影片时长</p>
                    <p className='text-lg font-semibold'>
                      {movieDetail.videoLength
                        ? `${movieDetail.videoLength}分钟`
                        : 'N/A'}
                    </p>
                  </div>
                  <div className='text-center md:text-left'>
                    <p className='text-muted-foreground text-sm'>导演</p>
                    <p className='text-lg font-semibold'>
                      {movieDetail.director?.name ?? 'N/A'}
                    </p>
                  </div>
                </div>
              </section>
              <section className='mt-16 mb-8 space-y-10'>
                {/* --- 标签 (Genres) --- */}
                <div>
                  <h2 className='mb-4 text-2xl font-bold'>标签</h2>
                  <div className='flex flex-wrap gap-2'>
                    {movieDetail.genres.map((genre) => (
                      <Badge
                        key={genre.id}
                        variant='secondary'
                        className='cursor-pointer'
                        onClick={() => handleClickMetaInfo('genre', genre)}
                      >
                        {genre.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* --- 剧照 (Samples) --- */}
                <div>
                  <h2 className='mb-4 text-2xl font-bold'>剧照</h2>
                  <ScrollArea className='w-full rounded-lg whitespace-nowrap'>
                    <div className='flex w-max space-x-4 pb-4'>
                      {movieDetail.samples.map((sample, index) => (
                        <figure key={sample.id} className='shrink-0'>
                          <img
                            src={proxyImageUrl(sample.src)} // 使用缩略图以加快加载
                            alt={sample.alt ?? ''}
                            className='bg-muted/20 h-48 w-auto cursor-pointer rounded-md object-contain transition-opacity hover:opacity-80'
                            // onClick={() => openLightbox(lightboxSlides, index)}
                          />
                        </figure>
                      ))}
                    </div>
                    <ScrollBar orientation='horizontal' />
                  </ScrollArea>
                </div>

                {/* --- 相似影片 --- */}
                <div>
                  <h2 className='mb-4 text-2xl font-bold'>相似影片</h2>
                  <ScrollArea className='w-full rounded-lg whitespace-nowrap'>
                    {/* 3. 使用 Flexbox 容器来排列所有项目 */}
                    <div className='flex w-max space-x-4 p-1'>
                      {movieDetail.similarMovies.map((similar) => (
                        // 4. 定义每个可点击的项目
                        <div
                          key={similar.id}
                          onClick={() => handleSimilarMovieClick(similar.id)}
                          className='group w-36 cursor-pointer space-y-2' // 核心: 使用固定宽度
                        >
                          <div className='overflow-hidden rounded-md'>
                            <img
                              src={proxyImageUrl(similar.img)}
                              alt={similar.title}
                              className='bg-muted/20 aspect-[2/3] w-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105'
                            />
                          </div>
                          <p className='text-muted-foreground truncate text-center text-xs'>
                            {similar.title}
                          </p>
                        </div>
                      ))}
                    </div>
                    <ScrollBar orientation='horizontal' />
                  </ScrollArea>
                </div>
              </section>
            </main>

            {/* --- 右侧边栏 --- */}
            <aside className='lg:col-span-3'>
              <div className='sticky top-8 space-y-6'>
                <div className='relative flex items-center gap-2'>
                  {movie.status === 'uncheck' && (
                    <Button
                      variant='default'
                      onClick={() => handleSubscribeMovie()}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? '正在订阅...' : '添加订阅'}
                    </Button>
                  )}
                  {movie.status === 'added' &&
                    mediaServer?.publicAddress &&
                    movie.mediaLibrary && (
                      <Button
                        variant='default'
                        className='cursor-pointer'
                        onClick={() => {
                          window.open(
                            `${mediaServer.publicAddress}/web/index.html#!/item?id=${(movie.mediaLibrary as any)?.Id}&serverId=${(movie.mediaLibrary as any)?.ServerId}`,
                            '_blank'
                          );
                        }}
                      >
                        <PlayCircle className='ml-2 h-4 w-4' />
                        已入库
                      </Button>
                    )}
                  {['downloading', 'downloaded', 'subscribed'].includes(
                    movie.status
                  ) && (
                    <Button
                      variant={
                        SubscribeMovieStatusMap[
                          movie.status as keyof typeof SubscribeMovieStatusMap
                        ].variant as any
                      }
                    >
                      {
                        SubscribeMovieStatusMap[
                          movie.status as keyof typeof SubscribeMovieStatusMap
                        ].label
                      }
                    </Button>
                  )}
                  <Button
                    variant='default'
                    className='ml-4'
                    onClick={handleOpenReviewDialog}
                  >
                    <MessageCircleCode className='h-4 w-4' />
                    评价
                  </Button>
                </div>
                <Card className='bg-card border-border'>
                  <CardContent className='space-y-3 p-4'>
                    {[
                      {
                        icon: (
                          <Film className='text-muted-foreground mr-2 h-4 w-4' />
                        ),
                        key: '制作商',
                        value: movieDetail.producer,
                        type: 'studio'
                      },
                      {
                        icon: (
                          <Building className='text-muted-foreground mr-2 h-4 w-4' />
                        ),
                        key: '发行商',
                        value: movieDetail.publisher,
                        type: 'label'
                      },
                      {
                        icon: (
                          <BookText className='text-muted-foreground mr-2 h-4 w-4' />
                        ),
                        key: '系列',
                        value: movieDetail.series,
                        type: 'series'
                      }
                    ].map(({ icon, key, value, type }) =>
                      value ? (
                        <div
                          key={key}
                          className='border-border/50 flex items-center justify-between border-b pb-2 text-sm font-medium last:border-b-0 last:pb-0'
                        >
                          <div className='flex items-center'>
                            {icon}
                            <p className='text-muted-foreground'>{key}</p>
                          </div>
                          <a
                            className='cursor-pointer text-right underline-offset-1 hover:underline'
                            href={`https://www.javbus.com/${type}/${value.id}`}
                            target='_blank'
                          >
                            {value.name}
                          </a>
                        </div>
                      ) : null
                    )}
                  </CardContent>
                </Card>
                {movieDetail.magnets && (
                  <Card className='bg-card border-border'>
                    <CardHeader>
                      <CardTitle>资源下载</CardTitle>
                    </CardHeader>
                    <CardContent className='p-0'>
                      <ScrollArea className='h-[400px]'>
                        {/* 2. 在表格外层包裹 TooltipProvider */}
                        <TooltipProvider>
                          {/* 3. 使用 table-fixed 强制执行列宽 */}
                          <Table className='w-full table-fixed'>
                            <TableHeader className='bg-background/95 sticky top-0 z-10 backdrop-blur-sm'>
                              <TableRow>
                                {/* 标题列自动填充剩余空间 */}
                                <TableHead>标题</TableHead>
                                {/* 4. 为右侧列设置固定宽度 */}
                                <TableHead className='w-24 text-right'>
                                  大小
                                </TableHead>
                                <TableHead className='w-32 text-center'>
                                  操作
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {movieDetail.magnets?.map((magnet) => (
                                <TableRow key={magnet.id}>
                                  {/* 5. 实现标题列的 Tooltip 和截断 */}
                                  <TableCell className='py-2'>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className='flex items-center gap-2 overflow-hidden'>
                                          <div className='flex flex-shrink-0 items-center gap-1'>
                                            {magnet.isHD && (
                                              <Badge
                                                variant='destructive'
                                                className='px-1.5 py-0 text-xs'
                                              >
                                                HD
                                              </Badge>
                                            )}
                                            {magnet.hasSubtitle && (
                                              <Badge
                                                variant='outline'
                                                className='border-amber-500 px-1.5 py-0 text-xs text-amber-500'
                                              >
                                                字幕
                                              </Badge>
                                            )}
                                          </div>
                                          <p className='truncate' title=''>
                                            {magnet.title ?? magnet.link}
                                          </p>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{magnet.title ?? magnet.link}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TableCell>
                                  <TableCell className='py-2 text-right whitespace-nowrap'>
                                    {magnet.size}
                                  </TableCell>
                                  <TableCell className='space-x-1 py-2 text-center'>
                                    <Button
                                      variant='ghost'
                                      size='icon'
                                      onClick={() =>
                                        handleCopyMagnet(magnet.link)
                                      }
                                      title='复制磁力链接'
                                    >
                                      <Copy className='h-4 w-4' />
                                    </Button>
                                    <Button
                                      variant='ghost'
                                      size='icon'
                                      title='预览'
                                      onClick={() =>
                                        setPreviewingMagnet(magnet.link)
                                      }
                                    >
                                      <Eye className='h-4 w-4' />
                                    </Button>
                                    <Button
                                      variant='ghost'
                                      size='icon'
                                      title='下载'
                                      onClick={() =>
                                        handleDownloadMagnet(
                                          movieDetail,
                                          magnet
                                        )
                                      }
                                      disabled={isSubmitting}
                                    >
                                      <Download className='h-4 w-4' />
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
      <MovieReviewDialog
        review={{
          rating: movie.rating ? movie.rating : '0',
          comment: movie.comment ?? '',
          tags: movie.tags ? (movie.tags as unknown as string[]) : []
        }}
        isOpen={isReviewDialogOpen}
        onClose={handleCloseReviewDialog}
        onSubmit={(data) => handleSubmitReview(data)}
      />
    </div>
  );
}
