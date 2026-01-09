import { Movie, MovieStatus } from '@prisma/client';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
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

const useMovie = (movie: Movie) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

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
    toast.success('识别码已复制');
    setTimeout(() => setIsCopied(false), 2000);
  }, [movieDetail]);

  const handleCopyMagnet = useCallback((link: string) => {
    navigator.clipboard
      .writeText(link)
      .then(() => toast.success('磁力链接已复制!'))
      .catch(() => toast.error('复制失败'));
  }, []);

  const handleSubscribeMovie = useCallback(async () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success('订阅成功 (模拟)');
    }, 1000);
  }, [movieDetail?.id]);

  const handleDownloadMagnet = useCallback(async (magnet: any) => {
    if (!magnet) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success('下载任务已提交 (模拟)');
    }, 1000);
  }, []);

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
    handleSubmitReview
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
      {/* 1. 背景层：图片作为背景填充 */}
      <div
        className='absolute inset-0 bg-cover bg-top transition-transform duration-700 ease-out group-hover:scale-105'
        style={{ backgroundImage: `url(${proxyImageUrl(movieDetail.img)})` }}
      />

      {/* 2. 遮罩层组合 - 关键修改点 */}
      {/* 2.1 全局轻微压暗，保证文字在亮图上可见 */}
      <div className='absolute inset-0 bg-black/10' />

      {/* 2.2 底部渐变层：从透明过渡到背景色 (逐步变白/黑) */}
      {/* - h-2/3: 渐变占据下半部分 2/3 的高度，过渡更长更柔和
         - from-background: 底部完全是背景色
         - via-background/80: 中间部分保持较高不透明度，消除截断感
         - to-transparent: 顶部透明
      */}
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
const MagnetSection = ({ magnets, isSubmitting, movieDetail }: any) => {
  const [previewingMagnet, setPreviewingMagnet] = useState<string | null>(null);

  if (!magnets || magnets.length === 0) return null;

  const handleCopyMagnet = (link: string) => {
    navigator.clipboard
      .writeText(link)
      .then(() => toast.success('磁力链接已复制!'))
      .catch(() => toast.error('复制失败'));
  };

  const handleDownloadMagnet = async (movie: MovieDetail, magnet: Magnet) => {
    if (!magnet) {
      toast.error('没有磁力链接');
      return;
    }

    console.log(movie.title);
    console.log(magnet.link);

    const formData = new FormData();
    formData.append('title', movie.title ?? movie.id);
    formData.append('downloadURLs', JSON.stringify([magnet.link]));
    formData.append('downloadImmediately', 'true');
    const movieData: any = movie;
    movieData.type = 'jav';
    formData.append('movie', JSON.stringify(movieData));

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
        // 异步任务启动
      } else {
        toast.success(result.message || '文档创建成功！');
      }
    } catch (error: any) {
      console.error('[Submit] 错误:', error);
      toast.error(`发生错误: ${error.message}`);
    }
  };

  return (
    <>
      <Card className='bg-card border-border'>
        <CardHeader>
          <CardTitle>资源下载</CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          <ScrollArea className='h-[400px]'>
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
                  {magnets?.map((magnet: Magnet) => (
                    <TableRow key={magnet.id}>
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
                          variant='ghost'
                          size='icon'
                          title='下载'
                          onClick={() =>
                            handleDownloadMagnet(movieDetail, magnet)
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
const MovieInfoGrid = ({ movieDetail }: any) => {
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
    setIsReviewDialogOpen
  } = useMovie(movie);

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
                    <Button
                      className='w-full'
                      onClick={handleSubscribeMovie}
                      disabled={isSubmitting}
                      variant={
                        movie.status === 'subscribed' ? 'outline' : 'default'
                      }
                    >
                      {movie.status === 'subscribed' ? (
                        <CheckCircle2 className='mr-2 h-4 w-4' />
                      ) : (
                        <PlayCircle className='mr-2 h-4 w-4' />
                      )}
                      {movie.status === 'subscribed' ? '已订阅' : '添加订阅'}
                    </Button>
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
                movieDetail={movieDetail}
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
          rating: movie.rating ? movie.rating : '0',
          comment: movie.comment ?? '',
          tags: movie.tags ? (movie.tags as unknown as string[]) : []
        }}
        isOpen={isReviewDialogOpen}
        onClose={() => setIsReviewDialogOpen(false)}
        onSubmit={(data) => handleSubmitReview(data)}
      />
    </div>
  );
}
