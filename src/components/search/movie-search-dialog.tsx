// 'use client';

// import { useState, useEffect } from 'react';
// import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
// import { Loader2 } from 'lucide-react';
// import { MovieDetail } from '@/types/javbus';
// import { MovieDetailDialogLayout } from '../JAV/subscribe-detail';
// import { useLoading } from '@/app/context/loading-context';
// import { toast } from 'sonner';

// interface MovieSearchDialogProps {
//   movieId: string;
//   children: React.ReactNode;
//   autoOpen?: boolean;
// }

// export function MovieSearchDialog({ 
//   movieId, 
//   children, 
//   autoOpen = false 
// }: MovieSearchDialogProps) {
//   const [isOpen, setIsOpen] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [movieData, setMovieData] = useState<MovieDetail | null>(null);
//   const [hasSearched, setHasSearched] = useState(false);
  
//   // 使用全局loading
//   const { showLoader, hideLoader } = useLoading();

//   // 当autoOpen为true且有movieId时，自动开始搜索
//   useEffect(() => {
//     if (autoOpen && movieId && !hasSearched && !isOpen) {
//       handleSearch();
//     }
//   }, [autoOpen, movieId, hasSearched, isOpen]);

//   const handleSearch = async () => {
//     if (!movieId.trim()) {
//       toast.error('请输入有效的番号');
//       return;
//     }

//     showLoader(`正在搜索番号 "${movieId}"...`);
//     setError(null);
//     setMovieData(null);
//     setHasSearched(true);

//     try {
//       const response = await fetch(`/api/subscribe/javbus/movie/${movieId}`);
      
//       if (!response.ok) {
//         if (response.status === 404) {
//           throw new Error(`未找到番号 "${movieId}" 的相关信息`);
//         } else {
//           throw new Error(`请求失败，状态码: ${response.status}`);
//         }
//       }
      
//       const result = await response.json();
      
//       if (!result.data) {
//         throw new Error(`番号 "${movieId}" 没有返回有效数据`);
//       }
      
//       setMovieData(result.data);
//       setIsOpen(true); // 只有在成功获取数据后才打开弹窗
//     } catch (err) {
//       const errorMessage = err instanceof Error ? err.message : "发生未知错误";
//       setError(errorMessage);
//       toast.error(errorMessage);
//       // 搜索失败时不打开弹窗，只显示错误信息
//     } finally {
//       hideLoader();
//     }
//   };

//   const handleOpenChange = (open: boolean) => {
//     setIsOpen(open);
//     if (!open) {
//       // 关闭弹窗时重置状态
//       setError(null);
//       setMovieData(null);
//       setHasSearched(false);
//     }
//   };

//   return (
//     <Dialog open={isOpen} onOpenChange={handleOpenChange}>
//       <DialogTrigger asChild>
//         {children}
//       </DialogTrigger>
//       <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
//         <DialogTitle className="sr-only">电影详情</DialogTitle>
        
//         {/* 数据加载成功后，渲染布局组件 */}
//         {movieData && (
//           <MovieDetailDialogLayout movie={movieData} />
//         )}
//       </DialogContent>
//     </Dialog>
//   );
// }
