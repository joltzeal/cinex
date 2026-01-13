// 'use client';

// import {
//   Dialog,
//   DialogContent,
//   DialogTitle,
//   DialogTrigger
// } from '@/components/ui/dialog';
// import { AlertCircle, Loader2 } from 'lucide-react';
// import { useEffect, useState, useRef } from 'react';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { Movie } from '@prisma/client';
// import MovieDetail from './movie';

// const LoadingState = () => (
//   <div className='flex min-h-125 flex-col items-center justify-center'>
//     <Loader2 className='text-primary h-12 w-12 animate-spin' />
//     <p className='text-muted-foreground mt-4'>正在加载影片信息...</p>
//   </div>
// );

// // Error or no-data message component for the dialog
// const MessageState = ({
//   title,
//   message
// }: {
//   title: string;
//   message: string;
// }) => (
//   <div className='flex min-h-125 items-center justify-center p-4'>
//     <Alert variant='destructive' className='max-w-md'>
//       <AlertCircle className='h-4 w-4' />
//       <AlertTitle>{title}</AlertTitle>
//       <AlertDescription>{message}</AlertDescription>
//     </Alert>
//   </div>
// );

// // --- Dialog Content (Contains all the data fetching logic) ---

// interface MovieDetailDialogContentProps {
//   movie: Movie | null;
//   isLoading: boolean;
//   error: string | null;
// }

// function MovieDetailDialogContent({
//   movie,
//   isLoading,
//   error
// }: MovieDetailDialogContentProps) {
//   // --- Render Logic ---
//   if (isLoading) {
//     return <LoadingState />;
//   }

//   if (error) {
//     return <MessageState title='加载错误' message={error} />;
//   }

//   if (!movie) {
//     return <MessageState title='无数据' message='找不到该影片的信息。' />;
//   }

//   return <MovieDetail movie={movie} />;
// }

// // --- Main Exported Dialog Component ---

// interface MovieDetailDialogProps {
//   movieId: string;
//   children: React.ReactNode; // This will be the trigger element (e.g., a button or card)
// }

// export function MovieDetailDialog({
//   movieId,
//   children
// }: MovieDetailDialogProps) {
//   const [open, setOpen] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [movie, setMovie] = useState<Movie | null>(null);

//   // 使用 ref 跟踪是否已经获取过数据
//   const hasFetchedRef = useRef(false);
//   const lastMovieIdRef = useRef<string | null>(null);

//   // 当对话框打开时触发数据获取
//   useEffect(() => {
//     // 只有在对话框打开且未获取过数据，或者 movieId 变化时才获取
//     if (
//       open &&
//       (!hasFetchedRef.current || lastMovieIdRef.current !== movieId)
//     ) {
//       const fetchMovieData = async () => {
//         console.log(`MovieDetailDialog: Fetching data for ID: ${movieId}...`);
//         setIsLoading(true);
//         setError(null);

//         try {
//           const response = await fetch(`/api/movie/${movieId}`);
//           if (!response.ok) throw new Error(`请求失败: ${response.status}`);

//           const result = await response.json();
//           if (!result || !result.data) throw new Error('未找到影片数据。');

//           setMovie(result.data);
//           hasFetchedRef.current = true;
//           lastMovieIdRef.current = movieId;
//         } catch (err: any) {
//           setError(err.message || '加载数据时发生未知错误。');
//           setMovie(null);
//         } finally {
//           setIsLoading(false);
//         }
//       };

//       fetchMovieData();
//     }
//   }, [open, movieId]);

//   // 当对话框关闭时，重置获取标志（可选，根据需求决定）
//   const handleOpenChange = (newOpen: boolean) => {
//     setOpen(newOpen);
//   };

//   return (
//     <Dialog open={open} onOpenChange={handleOpenChange}>
//       <DialogTrigger asChild>{children}</DialogTrigger>
//       <DialogContent className='min-w-[90vw] border-none bg-none p-0'>
//         {open && (
//           <MovieDetailDialogContent
//             movie={movie}
//             isLoading={isLoading}
//             error={error}
//           />
//         )}
//       </DialogContent>
//     </Dialog>
//   );
// }
