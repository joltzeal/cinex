"use client"
import MovieDetailDisplay from "@/components/search/movie-detail";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMovieStore } from "@/store/useMovieStore";
import { Magnet, MovieDetail } from "@/types/javbus";
import { SubscribeData } from "@prisma/client";
import {
  AlertCircle,
  Loader2
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import "yet-another-react-lightbox/styles.css";

// 加载状态组件
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-[calc(100dvh-150px)]">
    <Loader2 className="h-12 w-12 animate-spin text-primary" />
    <p className="mt-4 text-muted-foreground">正在加载影片信息...</p>
  </div>
);

// 错误或无数据提示组件
const MessageState = ({ title, message }: { title: string, message: string }) => (
  <div className="flex items-center justify-center h-[calc(100dvh-150px)] p-4">
    <Alert variant="destructive" className="max-w-md">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  </div>
);
export default function SearchPage() {

  const params = useParams();
  const id = params.id as string;


  // 1. 从 Zustand Store 中获取数据和 action
  const { currentMovie, setCurrentMovie } = useMovieStore();
  const [subscribeMovie, setSubscribeMovie] = useState<SubscribeData | null>(null);

  // 2. 本地状态只保留加载和错误，因为数据源是全局 Store
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 检查 Store 中的数据是否是当前页面需要的数据
    if (currentMovie && currentMovie.id === id) {
      console.log(`SearchPage: 从 Store 中直接命中数据，ID: ${id}`);
      const fetchSubscribeMovie = async () => {
        // 确保 id 存在时才执行请求
        if (id) {
          const response = await fetch(`/api/subscribe/movie/${id}`);
          const result = await response.json();
          setSubscribeMovie(result.data);
        }
      }
      fetchSubscribeMovie();
      return; // 数据已存在，无需任何操作
    }

    // 如果 Store 中没有数据 (例如刷新页面)，则执行 fetch
    const fetchMovieData = async () => {
      console.log(`SearchPage: Store 未命中，正在为 ID: ${id} 获取数据...`);
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/movie/${id}`);
        if (!response.ok) throw new Error(`请求失败，状态码: ${response.status}`);
        const result = await response.json();
        if (!result || !result.data) throw new Error("未找到该影片的数据。");

        // 将获取到的数据存入 Store
        setCurrentMovie(result.data);
        
        

      } catch (err: any) {
        setError(err.message || "加载数据时发生未知错误。");
        setCurrentMovie(null); // 出错时清空数据
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchMovieData();
    }


  }, [id, currentMovie, setCurrentMovie]); // 依赖项更新


  const isFetchingData = isLoading && (!currentMovie || currentMovie.id !== id);


  // --- 渲染逻辑变得极为简洁 ---
  if (isFetchingData) {
    return <LoadingState />;
  }

  if (error) {
    return <MessageState title="加载出错" message={error} />;
  }

  if (!currentMovie) {
    return <MessageState title="无数据" message="无法找到对应的影片信息。" />;
  }

  return <MovieDetailDisplay movie={currentMovie} subscribeMovie={subscribeMovie} />;
}