'use client';

import { useState, useEffect } from "react";
import { Movie } from "@prisma/client";
import { Play, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMediaServer } from "@/contexts/media-server-context";
import { toast } from "sonner";

export function RandomMovie({ movies }: { movies: Movie[] }) {
  const mediaServer = useMediaServer();
  // 初始化时使用第一个电影，避免 hydration 不匹配
  const [currentMovie, setCurrentMovie] = useState<Movie>(movies[0]);
  const [isHovered, setIsHovered] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  // 客户端 mount 后再随机选择电影
  useEffect(() => {
    const randomMovie = movies[Math.floor(Math.random() * movies.length)];
    setCurrentMovie(randomMovie);
  }, [movies]);

  const proxyImageUrl = (url: string | null | undefined): string => {
    if (!url) return "";
    return `/api/subscribe/javbus/proxy?url=${encodeURIComponent(url)}`;
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMovie = movies[Math.floor(Math.random() * movies.length)];
    setCurrentMovie(newMovie);
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!mediaServer || !mediaServer.publicAddress) {
      toast.error('媒体服务器配置未设置');
      return;
    }
    if (!currentMovie.mediaLibrary) {
      toast.error('媒体信息未设置');
      return;
    }
    const mediaInfo = currentMovie.mediaLibrary as any | null;
    const ml = `${mediaServer.publicAddress}/web/index.html#!/item?id=${mediaInfo.Id}&serverId=${mediaInfo.ServerId}`;
    window.open(ml, '_blank');
  };

  const handleCardClick = () => {
    // 移动端点击切换按钮显示
    setShowButtons(!showButtons);
  };

  return (
    <Card className="flex flex-col p-0 overflow-hidden">
      <CardContent className="flex-grow p-0">
        <div 
          className="relative group cursor-pointer w-full h-full"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
            setShowButtons(false);
          }}
          onClick={handleCardClick}
        >
          <img 
            src={proxyImageUrl(currentMovie.cover)} 
            alt={currentMovie.title} 
            className="w-full h-full object-cover rounded-lg transition-all duration-300" 
          />
          
          {/* 遮罩层和按钮 */}
          <div 
            className={`absolute inset-0 bg-black/60 rounded-lg flex flex-col justify-center gap-4 transition-opacity duration-300 ${
              isHovered || showButtons ? 'opacity-100' : 'opacity-0 md:opacity-0'
            }`}
          >
            <div className="text-white text-center text-lg font-bold">
            {currentMovie.title}
            </div>
            <div className="flex items-center justify-center gap-4">
            <Button
              size="icon"
              variant="secondary"
              className="h-12 w-12 rounded-full"
              onClick={handlePlay}
            >
              <Play className="h-6 w-6" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-12 w-12 rounded-full"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-6 w-6" />
            </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}