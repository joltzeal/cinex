"use-client";

import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails"; // 导入缩略图插件
import "yet-another-react-lightbox/plugins/thumbnails.css";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import React, { useState } from "react";

type SafeImageProps = {
  src: string;
  alt: string;
  className?: string;
  fallbackText?: string;
  fallbackIcon?: React.ReactNode;
};

export default function SafeImage({
  src,
  alt,
  className = "w-16 h-16 object-cover rounded-md",
  fallbackText = "加载失败",
  fallbackIcon,
}: SafeImageProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        role="img"
        aria-label={fallbackText}
        className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}
      >
        {fallbackIcon ?? (
          <span className="text-xs px-2 py-1 rounded">{fallbackText}</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      // 安全：禁用拖拽，防止占位被拖走；也可加 loading="lazy"
      draggable={false}
    />
  );
}
// 1. 更新 Props，接收一个图片 URL 数组∏
interface FullScreenImagePreviewProps {
  images: string[]; // 不再是 src?: string
  alt: string;
}

export function FullScreenImagePreview({ images, alt }: FullScreenImagePreviewProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0); // 状态来追踪当前点击的图片索引

  // 2. 如果没有图片，显示占位符
  if (!images || images.length === 0) {
    return (
      <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
        无图
      </div>
    );
  }
  
  const slides = images.map((src) => ({ src }));

  const firstImage = images[0];

  return (
    <>
      <div
        className="relative w-16 h-16 cursor-pointer hover:opacity-80 transition-opacity group flex items-center justify-center"
        onClick={() => setOpen(true)}
      >
        <SafeImage src={firstImage} alt={alt} className="w-16 h-16 object-cover rounded-md" />
        {images.length > 1 && (
          <div className="absolute top-1 right-1 bg-black bg-opacity-60 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
            {images.length}
          </div>
        )}
      </div>

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        slides={slides} // 5. 传递所有图片
        plugins={[Fullscreen, Zoom, Thumbnails]}

      />
    </>
  );
}