import { Movie, MovieStatus, Document, DocumentDownloadURL } from '@prisma/client';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { useLoading } from "@/contexts/loading-context";
import { useRouter } from "next/navigation";
import { Rating, RatingButton } from '@/components/ui/shadcn-io/rating';

import {
  BookText,
  Building,
  CalendarDays,
  CheckCircle2,
  Clapperboard,
  Clock,
  Copy,
  Download,
  Eye,
  Film,
  MessageCircleCode,
  PlayCircle,
  Star,
  LoaderCircle,
  Loader,

  UserCircle
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '../ui/tooltip';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/table';
import {
  ImagePreviewDialog,
  useImagePreview
} from '../ui/image-preview-dialog';
import { MovieReviewDialog } from '@/features/subscribe/movie-review';
import { Magnet, MovieDetail } from '@/types/javbus';
import { MagnetPreviewDialog } from '../magnet/magnet-preview-dialog';
import { useMediaServer } from '@/contexts/media-server-context';
import { SubscribeMovieStatusMap } from '@/constants/data';
import { subscribeToTaskToast } from '@/lib/task-sse-subscribe';
import { extractHash } from '@/lib/magnet/magnet-helper';

const useMovie = (movie: Movie) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  // const { showLoader, hideLoader, updateLoadingMessage } = useLoading();
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewData, setReviewData] = useState({
    rating: movie.rating,
    comment: movie.comment,
    tags: movie.tags
  });
  const movieDetail = useMemo(() => {
    const detail = (movie.detail as any) || {};
    const magnets = (movie.magnets as any) || [];
    return {
      ...detail,
      magnets: Array.isArray(magnets) ? magnets : []
    };
  }, [movie]);

  const handleCopyId = useCallback(() => {
    if (!movieDetail?.id) return;
    navigator.clipboard.writeText(movieDetail.id);
    setIsCopied(true);
    toast.success('番号已复制');
    setTimeout(() => setIsCopied(false), 2000);
  }, [movieDetail]);

  const handleCopyMagnet = useCallback((link: string) => {
    navigator.clipboard
      .writeText(link)
      .then(() => toast.success('磁力链接已复制!'))
      .catch(() => toast.error('复制失败'));
  }, []);

  const handleSubscribeMovie = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/movie/${movieDetail.id}/subscribe`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;

        if (response.status === 400 && errorMessage.includes("影片已订阅")) {
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
        movie.status = MovieStatus.subscribed;
        // movieDetail.status = 'subscribed';
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

  const handleDownloadMagnet = async (movie: Movie, magnet: Magnet) => {

    if (!magnet) {
      toast.error("没有磁力链接");
      return;
    }



    const formData = new FormData();
    let images;
    if ((movie.detail as unknown as MovieDetail)?.samples) {
      images = [movie.poster, movie.cover, ...(movie.detail as unknown as MovieDetail)?.samples.map((img) => img.src)]
    } else {
      images = [movie.poster, movie.cover]
    }
    formData.append('title', (movie.detail as unknown as MovieDetail)?.title || movie.title);
    formData.append("downloadURLs", JSON.stringify([magnet.link]));
    formData.append("downloadImmediately", 'true');
    formData.append('images', JSON.stringify(images))
    // const movieData: any = movie
    // movieData.type = 'jav'
    formData.append('movieId', movie.id)

    // // 🔥 关键：显示全屏 loading
    // showLoader("正在提交下载任务...");

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
        subscribeToTaskToast(result.taskId, (data) => {
          // 如果需要，这里可以根据 data 更新页面的其他部分
          if (data.stage === 'DONE' || data.stage === 'ERROR') {
            setIsProcessing(false);
          }
        });
        // 异步任务启动，更新 loader 文本并开始监听
        // setTaskId(result.taskId); // 设置 taskId
        // updateLoadingMessage("任务已启动，正在连接服务器...");
        // listenToSse(result.taskId);
        // **不隐藏 loader**，让 SSE 处理器来控制
      } else {
        // 同步创建成功
        // hideLoader(); // 隐藏 loader
        toast.success(result.message || "文档创建成功！");
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

  const handleSubmitReview = async (data: {
    rating: string;
    comment: string;
    tags: string[];
  }) => {
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
        // 更新 movie 对象中的评价数据
        movie.rating = data.rating;
        movie.comment = data.comment;
        movie.tags = data.tags as any;
        // 更新状态以触发重新渲染
        setReviewData({
          rating: data.rating,
          comment: data.comment,
          tags: data.tags as any
        });
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

  const handleUnSubscribeMovie = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/movie/${movieDetail.id}/subscribe`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        toast.success("已取消订阅");
        movie.status = MovieStatus.uncheck;
      } else {
        toast.error("订阅失败");
      }
    } catch (error) {
      console.error("取消订阅失败:", error);
      if (error instanceof Error) {
        if (error.name === 'NetworkError' || error.message.includes('fetch')) {
          toast.error("网络错误，请检查网络连接");
        } else {
          toast.error(`取消订阅失败: ${error.message}`);
        }
      } else {
        toast.error("取消订阅失败，请重试");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    movieDetail,
    isSubmitting,
    isCopied,
    isReviewDialogOpen,
    setIsReviewDialogOpen,
    handleCopyId,
    handleCopyMagnet,
    handleSubscribeMovie,
    handleDownloadMagnet,
    handleSubmitReview,
    handleUnSubscribeMovie,
    reviewData,
  };
};

const proxyImageUrl = (url: string): string => {
  // if (!url) return "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2070&auto=format&fit=crop"; // 默认图防止空白
  // 实际项目中恢复您的 API 路径
  return `/api/subscribe/javbus/proxy?url=${encodeURIComponent(url)}`;
  // return url;
};
// --- 子组件: Banner ---
const MovieBanner = ({ movieDetail, isCopied, handleCopyId }: any) => {
  if (!movieDetail) return null;

  return (
    <div className='group bg-background relative h-125 w-full overflow-hidden lg:h-125'>
      <div
        className='absolute inset-0 bg-cover bg-top transition-transform duration-700 ease-out group-hover:scale-105'
        style={{ backgroundImage: `url(${proxyImageUrl(movieDetail.img)})` }}
      />

      <div className='absolute inset-0 bg-black/10' />

      <div className='from-background via-background/80 absolute bottom-0 left-0 h-3/4 w-full bg-linear-to-t to-transparent' />

      {/* 2.3 底部边缘修补层：再加一层很矮的实色渐变，确保底部边缘绝对“变白”，防止细微的图片露底 */}
      <div className='from-background absolute bottom-0 left-0 h-24 w-full bg-linear-to-t to-transparent' />

      {/* 3. 内容层 */}
      <div className='absolute inset-0 container mx-auto flex flex-col justify-end px-4 pb-12 sm:px-6 lg:px-8'>
        <div className='flex flex-col items-end gap-8 md:flex-row'>
          {/* 封面图：带阴影和边框 */}
          <div className='ring-border/20 bg-background/50 relative hidden aspect-800/538 w-full shrink-0 overflow-hidden rounded-xl shadow-2xl ring-1 transition-transform duration-500 group-hover:-translate-y-1 md:block md:w-70 lg:w-85'>
            <img
              src={proxyImageUrl(movieDetail.img)}
              alt='Poster'
              className='h-full w-full object-cover'
            />
          </div>

          {/* 移动端封面 */}
          <div className='ring-border/10 mb-4 aspect-video w-full overflow-hidden rounded-lg shadow-lg ring-1 md:hidden'>
            <img
              src={proxyImageUrl(movieDetail.img)}
              alt='Poster'
              className='h-full w-full object-cover'
            />
          </div>

          {/* 文本信息 */}
          <div className='mb-2 flex-1 space-y-4'>
            <div className='flex items-center gap-3'>
              <Badge variant='secondary'>
                {movieDetail.date || 'Unknown Date'}
              </Badge>
              {movieDetail.videoLength && (
                <Badge variant='secondary'>
                  <Clock className='mr-1.5 h-3.5 w-3.5' />{' '}
                  {movieDetail.videoLength} 分钟
                </Badge>
              )}
            </div>

            <h1 className='text-foreground line-clamp-3 text-3xl leading-tight font-extrabold tracking-tight drop-shadow-sm md:text-4xl'>
              {movieDetail.title}
            </h1>

            <div className='flex flex-wrap items-center gap-4'>
              <Badge
                onClick={handleCopyId}
                className='bg-background/80 hover:bg-background/80 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-0.5 shadow-sm'
              >
                <span className='text-foreground font-mono text-lg font-semibold tracking-wider'>
                  {movieDetail.id}
                </span>
                {isCopied ? (
                  <CheckCircle2 className='h-4 w-4 text-green-500' />
                ) : (
                  <Copy className='text-muted-foreground h-4 w-4' />
                )}
              </Badge>

              {/* 演员列表 */}
              <div className='flex flex-wrap gap-2'>
                {movieDetail.stars?.map((star: any) => (
                  <Badge
                    key={star.id}
                    variant='outline'
                    className='hover:bg-accent hover:text-accent-foreground bg-background/40 border-foreground/10 cursor-pointer py-1 backdrop-blur-sm transition-all'
                    onClick={() =>
                      window.open(
                        `https://www.javbus.com/star/${star.id}`,
                        '_blank'
                      )
                    }
                  >
                    <UserCircle className='mr-1.5 h-3 w-3 opacity-70' />
                    {star.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 子组件: 磁力链接表格 ---
const MagnetSection = ({ magnets, isSubmitting, movie, onMagnetDownload }: any) => {
  const [previewingMagnet, setPreviewingMagnet] = useState<string | null>(null);
  if (!magnets || magnets.length === 0) return null;

  const handleCopyMagnet = (link: string) => {
    navigator.clipboard
      .writeText(link)
      .then(() => toast.success('磁力链接已复制!'))
      .catch(() => toast.error('复制失败'));
  };

  const currentDownload = () => {
    let _downloadURLs: string[] = [];
    if (movie.documents && movie.documents.length > 0) {
      movie.documents.forEach((document: any) => {
        (document.downloadURLs as DocumentDownloadURL[]).forEach(url => {
          if (url.hash) {
            _downloadURLs.push(url.hash);
          }
        });
      });
    }
    return _downloadURLs;
  }


  return (
    <>
      <Card className='bg-card border-border gap-2 pb-0'>
        <CardHeader>
          <CardTitle>{movie.number} 资源下载</CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          <ScrollArea className='h-100'>
            <TooltipProvider>
              <Table className='w-full table-fixed'>
                <TableHeader className='bg-background/95 sticky top-0 z-10 backdrop-blur-sm'>
                  <TableRow>
                    <TableHead>标题</TableHead>
                    <TableHead className='w-24 text-right'>大小</TableHead>
                    <TableHead className='w-32 text-center'>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* { movie.documents && movie.documents.length > 0 && (
                    movie.documents.map(
                      (document: Document) => {
                        return 'aaa'
                      }
                    )
                  )} */}

                  {magnets?.map((magnet: Magnet) => (
                    <TableRow key={magnet.id}>
                      <TableCell className='py-2'>
                        <Tooltip>
                          <TooltipTrigger >
                            <div className='flex items-center gap-2 overflow-hidden'>
                              <div className='flex shrink-0 items-center gap-1'>
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
                          onClick={() => handleCopyMagnet(magnet.link)}
                          title='复制磁力链接'
                        >
                          <Copy className='h-4 w-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          title='预览'
                          onClick={() => setPreviewingMagnet(magnet.link)}
                        >
                          <Eye className='h-4 w-4' />
                        </Button>
                        <Button
                          disabled={!magnet.link || currentDownload().includes(extractHash(magnet.link)!) || isSubmitting}
                          variant='ghost'
                          size='icon'
                          title='下载'
                          onClick={() =>
                            onMagnetDownload(movie, magnet)
                          }
                        >
                          {
                            currentDownload().includes(extractHash(magnet.link)!) ? (
                              <LoaderCircle className='h-4 w-4 animate-spin' />
                            ) : isSubmitting ? (
                              <LoaderCircle className='h-4 w-4 animate-spin' />
                            ) : <Download className='h-4 w-4' />
                          }

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

      {/* MagnetPreviewDialog 在组件内部管理 */}
      <MagnetPreviewDialog
        magnetLink={previewingMagnet}
        open={!!previewingMagnet}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setPreviewingMagnet(null);
          }
        }}
      />
    </>
  );
};
// --- 子组件: 详细信息卡片 ---
const MovieInfoGrid = ({ movieDetail }: { movieDetail: MovieDetail }) => {
  if (!movieDetail) return null;
  return (
    <div className='bg-card/40 border-border/50 grid grid-cols-2 gap-4 rounded-xl border p-6 backdrop-blur-sm md:grid-cols-4'>
      <div className='space-y-1'>
        <p className='flex items-center gap-1 text-xs font-medium'>
          <CalendarDays className='h-3 w-3' /> 发行日期
        </p>
        <p className='text-sm font-semibold'>{movieDetail.date ?? 'N/A'}</p>
      </div>
      <div className='space-y-1'>
        <p className='text-muted-foreground flex items-center gap-1 text-xs font-medium'>
          <Clock className='h-3 w-3' /> 时长
        </p>
        <p className='text-sm font-semibold'>
          {movieDetail.videoLength ? `${movieDetail.videoLength} 分钟` : 'N/A'}
        </p>
      </div>
      <div className='col-span-2 space-y-1 md:col-span-2'>
        <p className='flex items-center gap-1 text-xs font-medium'>
          <Clapperboard className='h-3 w-3' /> 导演
        </p>
        <p className='cursor-pointer text-sm font-semibold hover:underline'>
          {movieDetail.director?.name ?? 'N/A'}
        </p>
      </div>
    </div>
  );
};

const ReviewCard = ({ data }: { data: Movie }) => {
  const { rating, comment, tags } = data || {};

  // 辅助判断函数：让逻辑更清晰
  const hasRating = rating !== null && rating !== undefined && rating !== "0";
  const hasComment = comment && comment.trim().length > 0;
  const hasTags = tags && Array.isArray(tags) && tags.length > 0;

  // 1. 全局拦截：如果三个属性真的全都是空的，则彻底不渲染组件
  if (!hasRating && !hasComment && !hasTags) {
    return null;
  }

  // 通用的 Label 样式组件，保持统一样式
  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-2">
      {children}
    </h2>
  );

  // 通用的空状态文字样式
  const EmptyStateText = ({ text }: { text: string }) => (
    <span className="text-sm text-slate-400 italic bg-slate-50 px-2 py-1 rounded">
      {text}
    </span>
  );

  return (
    <div className="w-full bg-white/60 dark:bg-card/40 border border-slate-200 dark:border-border/50 rounded-xl p-6 shadow-sm backdrop-blur-md transition-all hover:shadow-md">
      
      <div className="flex flex-col gap-6">
        
        {/* 第一行：评分与标签 (并排展示以节省空间，移动端自动换行) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-slate-100 pb-5">
          
          {/* 区域 1: 评分 */}
          <div className="flex flex-col items-start">
            <SectionLabel>评分 / Rating</SectionLabel>
            {hasRating ? (
              <div className="flex items-center gap-2">
                <Rating readOnly={true} defaultValue={parseInt(rating as string)}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <RatingButton key={index} className="text-yellow-500 w-5 h-5" />
                  ))}
                </Rating>
                <span className="text-sm font-bold text-slate-700 ml-1">{rating} 分</span>
              </div>
            ) : (
              <EmptyStateText text="暂无评分" />
            )}
          </div>

          {/* 区域 2: 标签 */}
          <div className="flex flex-col items-start sm:items-end">
            <SectionLabel>标签 / Tags</SectionLabel>
            {hasTags ? (
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {(tags as string[]).map((tag, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" // 假设你的 Badge 有 variant
                    className="px-2.5 py-0.5 text-xs font-medium  hover:bg-blue-100 border-transparent"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : (
              <EmptyStateText text="未添加标签" />
            )}
          </div>
        </div>

        {/* 第二行：评论内容 */}
        <div className="flex flex-col">
          <SectionLabel>评论 / Review</SectionLabel>
          <div className="min-h-[2rem]"> {/* 给一个最小高度防止布局跳动 */}
            {hasComment ? (
              <div className=" p-3 rounded-lg border ">
                <p className="text-sm sm:text-base leading-7 whitespace-pre-wrap break-words font-normal">
                  {comment}
                </p>
              </div>
            ) : (
              <EmptyStateText text="未填写文字评论" />
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
export default function MovieDetailDisplay({ movie }: { movie: Movie }) {
  const {
    movieDetail,
    isSubmitting,
    isCopied,
    handleCopyId,
    handleCopyMagnet,
    handleSubscribeMovie,
    handleDownloadMagnet,
    handleSubmitReview,
    isReviewDialogOpen,
    setIsReviewDialogOpen,
    handleUnSubscribeMovie,
    reviewData
  } = useMovie(movie);
  const mediaServer = useMediaServer();
  const { open, images, initialIndex, openPreview, setOpen } =
    useImagePreview();
  return (
    <div className='rounded-lg'>
      <ScrollArea className='text-foreground h-[calc(100dvh-62px)] rounded-lg'>
        <MovieBanner
          movieDetail={movieDetail}
          isCopied={isCopied}
          handleCopyId={handleCopyId}
        />
        <div className='relative z-10 container mx-auto -mt-8 px-4 py-8 lg:px-8'>
          <div className='grid grid-cols-1 gap-8 lg:grid-cols-12'>
            {/* --- Left Column: Main Content (8 cols) --- */}
            <main className='space-y-8 lg:col-span-8'>
              {/* Basic Info Grid */}
              
              <MovieInfoGrid movieDetail={movieDetail} />
              <ReviewCard data={{ ...movie, ...reviewData }} />


              {/* Genres */}
              <section>
                <h3 className='mb-3 flex items-center gap-2 text-lg font-semibold'>
                  <BookText className='text-primary h-4 w-4' /> 标签
                </h3>
                <div className='flex flex-wrap gap-2'>
                  {movieDetail.genres?.map((genre: any) => (
                    <Badge
                      key={genre.id}
                      variant='secondary'
                      className='hover:bg-primary hover:text-primary-foreground cursor-pointer px-3 py-1 text-sm transition-colors'
                      onClick={() =>
                        window.open(
                          `https://www.javbus.com/genre/${genre.id}`,
                          '_blank'
                        )
                      }
                    >
                      {genre.name}
                    </Badge>
                  ))}
                </div>
              </section>

              {/* Screenshots */}
              <section>
                <h3 className='mb-3 flex items-center gap-2 text-lg font-semibold'>
                  <Film className='text-primary h-4 w-4' /> 预览剧照
                </h3>
                <ScrollArea className='border-border/50 bg-card/30 w-full rounded-md border p-4 whitespace-nowrap'>
                  <div className='flex gap-4'>
                    {movieDetail.samples?.map((sample: any, index: number) => (
                      <div
                        key={sample.id}
                        className='group relative shrink-0 cursor-pointer overflow-hidden rounded-md'
                        onClick={() => {
                          const imageList = movieDetail.samples.map(
                            (s: any) => ({
                              src: proxyImageUrl(s.src),
                              alt: `Sample ${s.id}`,
                              title: `${movieDetail.id} - Sample ${index + 1}`
                            })
                          );
                          openPreview(imageList, index);
                        }}
                      >
                        <img
                          src={proxyImageUrl(sample.src)}
                          alt='Sample'
                          className='h-52 w-auto object-cover transition-transform duration-300 group-hover:scale-105'
                        />
                        <div className='absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10' />
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation='horizontal' />
                </ScrollArea>
              </section>

              {/* Similar Movies */}
              <section>
                <h3 className='mb-3 flex items-center gap-2 text-lg font-semibold'>
                  <Star className='text-primary h-4 w-4' /> 相似推荐
                </h3>
                <ScrollArea className='border-border/50 bg-card/30 w-full rounded-md border p-4 whitespace-nowrap'>
                  <div className='flex gap-4'>
                    {movieDetail.similarMovies?.map((similar: any) => (
                      <div
                        key={similar.id}
                        className='group w-32 cursor-pointer space-y-2'
                        onClick={() => console.log('Navigate to:', similar.id)}
                      >
                        <div className='relative aspect-2/3 overflow-hidden rounded-md shadow-sm'>
                          <img
                            src={proxyImageUrl(similar.img)}
                            alt={similar.title}
                            className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-110'
                          />
                          <div className='absolute inset-0 rounded-md ring-1 ring-black/10 ring-inset' />
                        </div>
                        <p className='text-muted-foreground group-hover:text-foreground truncate text-center text-xs transition-colors'>
                          {similar.title}
                        </p>
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation='horizontal' />
                </ScrollArea>
              </section>
            </main>

            {/* --- Right Column: Sidebar (4 cols) --- */}
            <aside className='space-y-6 pt-0 lg:col-span-4 lg:pt-0'>
              {/* Action Buttons */}
              <Card className='border-border shadow-sm'>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-base'>操作</CardTitle>
                </CardHeader>
                <CardContent className='grid gap-3'>
                  <div className='grid grid-cols-2 gap-3'>
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
                    {movie.status === 'subscribed' && (
                      <Button
                        variant='destructive'
                        onClick={() => handleUnSubscribeMovie()}
                      >
                        取消订阅
                      </Button>
                    )}
                    {['downloading', 'downloaded',].includes(
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
                      variant='outline'
                      className='w-full'
                      onClick={() => setIsReviewDialogOpen(true)}
                    >
                      <MessageCircleCode className='mr-2 h-4 w-4' />
                      评价
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Metadata Card */}
              <Card className='border-border shadow-sm'>
                <CardHeader className='border-border/50 border-b pb-3'>
                  <CardTitle className='text-base'>发行信息</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4 pt-4'>
                  {[
                    {
                      label: '制作商',
                      value: movieDetail.producer,
                      icon: Film,
                      type: 'studio'
                    },
                    {
                      label: '发行商',
                      value: movieDetail.publisher,
                      icon: Building,
                      type: 'label'
                    },
                    {
                      label: '系列',
                      value: movieDetail.series,
                      icon: BookText,
                      type: 'series'
                    }
                  ].map((item) =>
                    item.value ? (
                      <div
                        key={item.label}
                        className='group flex items-center justify-between'
                      >
                        <div className='text-muted-foreground flex items-center text-sm'>
                          <item.icon className='mr-2 h-4 w-4 opacity-70' />
                          {item.label}
                        </div>
                        <a
                          href={`https://www.javbus.com/${item.type}/${item.value.id}`}
                          target='_blank'
                          className='hover:text-primary max-w-45 truncate text-sm font-medium underline-offset-2 transition-colors hover:underline'
                        >
                          {item.value.name}
                        </a>
                      </div>
                    ) : null
                  )}
                </CardContent>
              </Card>


              {/* Magnet Table Component */}
              <MagnetSection

                magnets={movieDetail.magnets}
                isSubmitting={isSubmitting}
                movie={movie}
                onMagnetDownload={handleDownloadMagnet}
              />
            </aside>
          </div>
        </div>
      </ScrollArea>

      {/* Image Preview Dialog */}
      <ImagePreviewDialog
        images={images}
        open={open}
        onOpenChange={setOpen}
        initialIndex={initialIndex}
        title='预览剧照'
        showDownload={true}
      />
      <MovieReviewDialog
        review={{
          rating: reviewData.rating ? reviewData.rating : '0',
          comment: reviewData.comment ?? '',
          tags: reviewData.tags ? (reviewData.tags as unknown as string[]) : []
        }}
        isOpen={isReviewDialogOpen}
        onClose={() => setIsReviewDialogOpen(false)}
        onSubmit={(data) => handleSubmitReview(data)}
      />
    </div>
  );
}
