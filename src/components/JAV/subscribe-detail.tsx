
// import { Badge } from "@/components/ui/badge";
// import { Separator } from "@/components/ui/separator";
// import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { useRouter } from "next/navigation";

// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Button } from "@/components/ui/button";
// import { MovieDetail, Magnet } from "@/types/javbus"; // 1. 导入 Magnet 类型
// import { useCallback, useState } from "react";
// import { openGlobalLightbox } from "@/components/global-lightbox-provider";
// import { Copy, Download, Eye, Sparkles, Subtitles, Loader2 } from "lucide-react";
// import { toast } from "sonner";
// import { MagnetPreviewDialog } from "@/components/magnet-preview-dialog"; // 1. 导入预览组件
// import { useLoading } from "@/app/context/loading-context";
// import { SseProgress } from "@/types";
// import { ScrollArea } from "../ui/scroll-area";

// // --- 图片代理辅助函数 (保持不变) ---
// const createProxyUrl = (url: string | null | undefined): string => {
//     if (!url) return "";
//     return `/api/subscribe/javbus/proxy?url=${encodeURIComponent(url)}`;
// };



// export function MovieDetailDialogLayout({ movie, showSubscribeButton }: { movie: MovieDetail & { magnets?: Magnet[] }, showSubscribeButton: boolean }) {
//     const [lightboxIndex, setLightboxIndex] = useState(0);
//     const [taskId, setTaskId] = useState<string | null>(null);
//     const [progress, setProgress] = useState<SseProgress[]>([]);
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const [isSubscribing, setIsSubscribing] = useState(false);
//     const lightboxSlides = [
//         ...(movie.img ? [{ src: createProxyUrl(movie.img) }] : []),
//         ...(movie.samples?.map(sample => ({ src: createProxyUrl(sample.src) })).filter(slide => slide.src) || [])
//     ];
//     const router = useRouter();
//     const [open, setOpen] = useState(false);
//     const [previewingMagnet, setPreviewingMagnet] = useState<string | null>(null);
//     const imageWidth = movie.imageSize?.width || 800;
//     const imageHeight = movie.imageSize?.height || 538;
//     const aspectRatio = `${imageWidth} / ${imageHeight}`;
//     const { showLoader, hideLoader, updateLoadingMessage } = useLoading();
//     const listenToSse = useCallback((id: string) => {
//         console.log(`[SSE] 开始监听任务: ${id}`);
//         const eventSource = new EventSource(`/api/download/status/${id}`);

//         eventSource.onopen = () => {
//             console.log(`[SSE] 连接已建立: ${id}`);
//             updateLoadingMessage("已连接到服务器，等待任务开始...");
//         };

//         eventSource.onmessage = (event) => {
//             try {
//                 console.log(`[SSE] 收到消息:`, event.data);
//                 const newProgress = JSON.parse(event.data);
//                 console.log(`[SSE] 解析后的进度:`, newProgress);

//                 // 更新进度数组
//                 setProgress(prev => [...prev, newProgress]);

//                 // 更新 loader 的文本
//                 updateLoadingMessage(`[${newProgress.stage}] ${newProgress.message}`);

//                 if (newProgress.stage === 'CONNECTED') {
//                     console.log(`[SSE] 连接确认`);
//                     updateLoadingMessage("连接已建立，等待任务开始...");
//                 } else if (newProgress.stage === 'DONE') {
//                     console.log(`[SSE] 任务完成，关闭连接`);
//                     toast.success(newProgress.message || '所有任务处理完毕！');
//                     eventSource.close();
//                     hideLoader(); // 隐藏 loader
//                     setIsSubmitting(false);
//                     router.refresh();
//                 } else if (newProgress.stage === 'ERROR') {
//                     console.log(`[SSE] 任务出错，关闭连接`);
//                     toast.error(newProgress.message || '任务处理时发生错误。');
//                     eventSource.close();
//                     hideLoader(); // 隐藏 loader
//                     setIsSubmitting(false);
//                 }
//             } catch (error) {
//                 console.error('SSE 数据解析错误:', error);
//                 toast.error('接收进度数据时发生错误');
//                 eventSource.close();
//                 hideLoader();
//                 setIsSubmitting(false);
//             }
//         };

//         eventSource.onerror = (error) => {
//             console.error('SSE 连接错误:', error);
//             console.log(`[SSE] EventSource readyState:`, eventSource.readyState);

//             // 检查连接状态
//             if (eventSource.readyState === EventSource.CLOSED) {
//                 console.log('[SSE] 连接已关闭');
//                 toast.error('与服务器的进度连接已断开');
//                 hideLoader();
//                 setIsSubmitting(false);
//             } else if (eventSource.readyState === EventSource.CONNECTING) {
//                 console.log('[SSE] 正在尝试重新连接...');
//                 updateLoadingMessage("连接断开，正在重新连接...");
//             }
//         };

//         return eventSource;
//     }, [router, hideLoader, updateLoadingMessage]); // 添加 context 函数到依赖项
//     // 复制磁力链接到剪贴板的辅助函数
//     const handleCopyMagnet = (link: string) => {
//         navigator.clipboard.writeText(link)
//             .then(() => toast.success("磁力链接已复制!"))
//             .catch(() => toast.error("复制失败"));
//     };

//     const handleSubscribeMovie = async (movie: MovieDetail) => {
//         setIsSubscribing(true);
//         try {
//             const response = await fetch(`/api/movie/${movie.id}/subscribe`, {
//                 method: "POST",
//             });

//             if (!response.ok) {
//                 const errorData = await response.json().catch(() => ({}));
//                 const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;

//                 if (response.status === 400 && errorMessage.includes("already subscribed")) {
//                     toast.error("该影片已经订阅过了");
//                 } else if (response.status === 404) {
//                     toast.error("影片未找到");
//                 } else if (response.status >= 500) {
//                     toast.error("服务器错误，请稍后重试");
//                 } else {
//                     toast.error(`订阅失败: ${errorMessage}`);
//                 }
//                 return;
//             }

//             const result = await response.json();
//             if (result.success) {
//                 toast.success("订阅成功！");
//             } else {
//                 toast.error("订阅失败");
//             }
//         } catch (error) {
//             console.error("订阅失败:", error);
//             if (error instanceof Error) {
//                 if (error.name === 'NetworkError' || error.message.includes('fetch')) {
//                     toast.error("网络错误，请检查网络连接");
//                 } else {
//                     toast.error(`订阅失败: ${error.message}`);
//                 }
//             } else {
//                 toast.error("订阅失败，请重试");
//             }
//         } finally {
//             setIsSubscribing(false);
//         }
//     };

//     const handleDownloadMagnet = async (movie: MovieDetail, magnet: Magnet) => {
//         console.log(movie);
//         if (!magnet) {
//             toast.error("没有磁力链接");
//             return;
//         }
//         console.log(magnet);

//         // 重置状态
//         setProgress([]);
//         setTaskId(null);
//         setIsSubmitting(true);

//         const formData = new FormData();
//         formData.append('title', movie.title ?? movie.id)
//         formData.append("downloadURLs", JSON.stringify([magnet.link]));
//         formData.append("downloadImmediately", 'true');
//         const movieData: any = movie
//         movieData.type = 'jav'
//         formData.append('movie', JSON.stringify(movieData))
//         // 🔥 关键：显示全屏 loading
//         showLoader("正在提交下载任务...");

//         try {
//             const response = await fetch("/api/download", {
//                 method: "POST",
//                 body: formData,
//             });

//             const result = await response.json();

//             if (!response.ok) {
//                 throw new Error(result.message || "创建失败");
//             }

//             if (response.status === 202 && result.taskId) {
//                 // 异步任务启动，更新 loader 文本并开始监听
//                 setTaskId(result.taskId); // 设置 taskId
//                 updateLoadingMessage("任务已启动，正在连接服务器...");
//                 console.log(`[Submit] 启动异步任务: ${result.taskId}`);
//                 listenToSse(result.taskId);
//                 // **不隐藏 loader**，让 SSE 处理器来控制
//             } else {
//                 // 同步创建成功
//                 hideLoader(); // 隐藏 loader
//                 toast.success(result.message || "文档创建成功！");
//                 router.refresh();
//                 setIsSubmitting(false);
//             }
//         } catch (error: any) {
//             console.error('[Submit] 错误:', error);
//             hideLoader(); // 隐藏 loader
//             toast.error(`发生错误: ${error.message}`);
//             setIsSubmitting(false); // 出错时解锁按钮
//         }
//     };

//     return (
//         // 3. 将整个布局包裹在 Tabs 组件中
//         <>
//             <Tabs defaultValue="details" className="w-full">
//                 <ScrollArea className="w-full h-[80vh]">
//                     <div className="overflow-y-hidden p-4">
//                         <div className="grid gap-8 md:grid-cols-5 ">
//                             {/* 左侧: 封面图 (保持不变) */}
//                             <div className="md:col-span-2">
//                                 <div
//                                     className="relative w-full rounded-lg overflow-hidden bg-muted cursor-pointer group"
//                                     style={{ aspectRatio: aspectRatio }}
//                                     onClick={() => openGlobalLightbox(lightboxSlides, 0,)}
//                                 >
//                                     <img src={createProxyUrl(movie.img)} alt={movie.title} className="w-full h-full object-cover" />
//                                     <div className="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
//                                         <p className="text-white opacity-0 group-hover:opacity-100 transition-opacity">点击预览</p>
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* 右侧: 标题和基本信息 (保持不变) */}
//                             <div className="md:col-span-3 space-y-4">
//                                 <DialogHeader>
//                                     <DialogTitle className="text-2xl"><a href={`https://www.javbus.com/${movie.id}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{movie.title}</a></DialogTitle>
//                                     <DialogDescription>{movie.id}</DialogDescription>
//                                     <div className="flex"><p className="w-24 font-semibold shrink-0">发行日期:</p> <p>{movie.date}</p></div>
//                                     <div className="flex"><p className="w-24 font-semibold shrink-0">影片时长:</p> <p>{movie.videoLength} 分钟</p></div>
//                                     {
//                                         showSubscribeButton && (!movie.magnets || movie.magnets.length === 0) && (
//                                             <div className="flex">
//                                                 <Button
//                                                     onClick={() => handleSubscribeMovie(movie)}
//                                                     disabled={isSubscribing}
//                                                     className="min-w-[100px]"
//                                                 >
//                                                     {isSubscribing ? (
//                                                         <>
//                                                             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                                                             订阅中...
//                                                         </>
//                                                     ) : (
//                                                         "订阅影片"
//                                                     )}
//                                                 </Button>
//                                             </div>
//                                         )
//                                     }
//                                     <div className="flex">

//                                     </div>


//                                 </DialogHeader>
//                             </div>

//                             {/* 下方整行: 标签页触发器 */}
//                             <div className="md:col-span-5">
//                                 <TabsList className="grid w-full grid-cols-2">
//                                     <TabsTrigger value="details">影片信息</TabsTrigger>
//                                     <TabsTrigger value="magnets" disabled={!movie.magnets || movie.magnets.length === 0}>
//                                         磁力链接 {movie.magnets && `(${movie.magnets.length})`}
//                                     </TabsTrigger>
//                                 </TabsList>
//                             </div>
//                         </div>

//                         {/* 标签页内容区域 */}
//                         <div className="mt-4">
//                             {/* 影片详情标签页内容 */}
//                             <TabsContent value="details">
//                                 <div className="grid gap-8 md:grid-cols-5">
//                                     <div className="md:col-span-5 space-y-4">
//                                         {/* 演员、类别等信息 */}
//                                         <div className="space-y-3 text-sm">
//                                             {movie.series && <div className="flex"><p className="w-24 font-semibold shrink-0">系列:</p> <p>{movie.series.name}</p></div>}
//                                             {movie.director && <div className="flex"><p className="w-24 font-semibold shrink-0">导演:</p> <p>{movie.director.name}</p></div>}
//                                             {movie.producer && <div className="flex"><p className="w-24 font-semibold shrink-0">制作商:</p> <p>{movie.producer.name}</p></div>}
//                                             {movie.publisher && <div className="flex"><p className="w-24 font-semibold shrink-0">发行商:</p> <p>{movie.publisher.name}</p></div>}
//                                             {movie.stars?.length > 0 && (
//                                                 <div className="flex items-start"><p className="w-24 font-semibold shrink-0 pt-1">演员:</p>
//                                                     <div className="flex flex-wrap gap-2">{movie.stars.map((star) => (<Badge key={star.id} variant="secondary">{star.name}</Badge>))}</div>
//                                                 </div>
//                                             )}
//                                             {movie.genres?.length > 0 && (
//                                                 <div className="flex items-start"><p className="w-24 font-semibold shrink-0 pt-1">类别:</p>
//                                                     <div className="flex flex-wrap gap-2">{movie.genres.map((genre) => (<Badge key={genre.id} variant="outline">{genre.name}</Badge>))}</div>
//                                                 </div>
//                                             )}
//                                         </div>
//                                     </div>
//                                     {/* 预览图 */}
//                                     <div className="md:col-span-5">
//                                         {movie.samples && movie.samples.length > 0 && (
//                                             <>
//                                                 <Separator className="my-6" />
//                                                 <div>
//                                                     <h3 className="text-lg font-semibold mb-2">预览图</h3>
//                                                     <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
//                                                         {movie.samples.map((sample, index) => (
//                                                             <div
//                                                                 key={sample.id}
//                                                                 className="relative rounded-lg overflow-hidden aspect-video bg-muted cursor-pointer group"
//                                                                 onClick={() => {
//                                                                     const targetIndex = index + (movie.img ? 1 : 0);
//                                                                     // openGlobalLightbox(lightboxSlides, targetIndex, () => { }, (index) => setLightboxIndex(index));
//                                                                 }}
//                                                             >
//                                                                 <img src={createProxyUrl(sample.thumbnail)} alt={sample.alt || ''} className="w-full h-full object-cover" />
//                                                                 <div className="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-40 transition-all"></div>
//                                                             </div>
//                                                         ))}
//                                                     </div>
//                                                 </div>
//                                             </>
//                                         )}
//                                     </div>
//                                 </div>
//                             </TabsContent>

//                             {/* 磁力链接标签页内容 */}
//                             <TabsContent value="magnets">
//                                 <ScrollArea className="w-full h-[60vh]">
//                                     <div className=" overflow-y-hidden pr-2">
//                                         <Table className="table-fixed w-full">
//                                             <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm">
//                                                 <TableRow>
//                                                     <TableHead >标题</TableHead>
//                                                     <TableHead className="w-28 text-right">大小</TableHead>
//                                                     <TableHead className="w-32 text-right">分享日期</TableHead>
//                                                     <TableHead className="w-48 text-center">操作</TableHead>
//                                                 </TableRow>
//                                             </TableHeader>
//                                             <TableBody>

//                                                 {movie.magnets?.map((magnet) => (
//                                                     <TableRow key={magnet.id}>
//                                                         <TableCell >
//                                                             <div className="flex items-center gap-2">
//                                                                 {magnet.isHD && <Badge variant="destructive">HD</Badge>}
//                                                                 {magnet.hasSubtitle && <Badge variant="outline" className="bg-[#eb9316] text-white">中文</Badge>}
//                                                                 <p className="truncate w-[600px]" title={magnet.title}>{magnet.title}</p>
//                                                             </div>
//                                                         </TableCell>
//                                                         <TableCell className="text-right">{magnet.size}</TableCell>
//                                                         <TableCell className="text-right">{magnet.shareDate}</TableCell>
//                                                         <TableCell className="text-center space-x-1">
//                                                             <Button variant="ghost" size="icon" onClick={() => handleCopyMagnet(magnet.link)} title="复制磁力链接">
//                                                                 <Copy className="h-4 w-4" />
//                                                             </Button>
//                                                             {/* 预留按钮 */}
//                                                             <Button variant="ghost" size="icon" title="预览" onClick={() => setPreviewingMagnet(magnet.link)}>
//                                                                 <Eye className="h-4 w-4" />
//                                                             </Button>
//                                                             <Button
//                                                                 variant="ghost"
//                                                                 size="icon"
//                                                                 title="下载"
//                                                                 onClick={() => handleDownloadMagnet(movie, magnet)}
//                                                                 disabled={isSubmitting}
//                                                             >
//                                                                 <Download className="h-4 w-4" />
//                                                             </Button>
//                                                         </TableCell>
//                                                     </TableRow>
//                                                 ))}


//                                             </TableBody>
//                                         </Table>
//                                     </div>
//                                 </ScrollArea>
//                             </TabsContent>
//                         </div>
//                     </div>
//                 </ScrollArea>
//             </Tabs>
//             {taskId && progress.length > 0 && (
//                 <div className="mt-4 p-4 border rounded-md bg-muted max-h-40 overflow-y-auto">
//                     <h4 className="font-semibold mb-2 text-sm">任务进度</h4>
//                     <ul className="space-y-1 text-xs">
//                         {progress.map((p, index) => (
//                             <li key={index}>
//                                 <span className="font-medium mr-2">[{p.stage}]</span>
//                                 <span>{p.message}</span>
//                             </li>
//                         ))}
//                     </ul>
//                 </div>
//             )}
//             <MagnetPreviewDialog
//                 magnetLink={previewingMagnet}
//                 open={!!previewingMagnet}
//                 onOpenChange={(isOpen) => {
//                     if (!isOpen) {
//                         setPreviewingMagnet(null);
//                     }
//                 }}
//             />
//         </>
//     );
// }