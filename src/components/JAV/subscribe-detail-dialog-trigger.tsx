// import { useState, useEffect } from "react";
// import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
// import { Loader2 } from "lucide-react";
// import { MovieDetail } from "@/types/javbus";
// import { MovieDetailDialogLayout } from "./subscribe-detail";

// export function MovieDetailsTrigger({ 
//   movieId, 
//   children, 
//   autoOpen = false,
//   showSubscribeButton = true
// }: { 
//   movieId: string; 
//   children: React.ReactNode; 
//   autoOpen?: boolean;
//   showSubscribeButton?: boolean;
// }) {
//   const [isOpen, setIsOpen] = useState(autoOpen);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [movieData, setMovieData] = useState<MovieDetail | null>(null);
  

//   // 当autoOpen为true且有movieId时，自动打开弹窗
//   useEffect(() => {
//     if (autoOpen && movieId && !isOpen) {
//       setIsOpen(true);
//     }
//   }, [autoOpen, movieId, isOpen]);

//   // 调试状态

//   const handleOpenChange = async (open: boolean) => {
//     setIsOpen(open);
    
//     if (!open) {
//       return;
//     }

//     // 核心逻辑: 仅在弹窗打开且数据尚未加载时，才去获取数据
//     if (!movieData && !isLoading) {
//       setIsLoading(true);
//       setError(null);
//       try {
//         const response = await fetch(`/api/movie/${movieId}`);
//         if (!response.ok) {
//           throw new Error(`请求失败，状态码: ${response.status}`);
//         }
//         const result = await response.json();
//         setMovieData(result.data); 
//       } catch (err) {
//         setError(err instanceof Error ? err.message : "发生未知错误");
//       } finally {
//         setIsLoading(false);
//       }
//     }
//   };

//   return (
//     <Dialog open={isOpen} onOpenChange={handleOpenChange}>
//       <DialogTrigger asChild>
//         <div className="cursor-pointer">
//           {children}
//         </div>
//       </DialogTrigger>
//       <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
//         <DialogTitle className="sr-only">电影详情</DialogTitle>
//         {/* 根据不同状态显示不同内容 */}
//         {isLoading && (
//           <div className="flex items-center justify-center min-h-[500px]">
//             <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
//           </div>
//         )}
//         {error && (
//           <div className="flex flex-col items-center justify-center min-h-[500px] text-center text-destructive">
//             <h3 className="text-lg font-semibold">加载详情失败</h3>
//             <p className="text-sm">{error}</p>
//           </div>
//         )}
//         {/* 数据加载成功后，渲染布局组件 */}
//         {movieData && (<MovieDetailDialogLayout movie={movieData} showSubscribeButton={showSubscribeButton} />)}
//       </DialogContent>
//     </Dialog>
//   );
// }