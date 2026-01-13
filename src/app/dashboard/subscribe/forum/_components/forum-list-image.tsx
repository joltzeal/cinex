'use client';

import { LazyImage } from "@/components/lazy-image";

export function ForumListImage({ src, alt }: { src: string, alt: string }) {
  const isJavbus = src.startsWith('https://www.javbus.com');
  const proxiedSrc = isJavbus ? `/api/subscribe/javbus/proxy?url=${encodeURIComponent(src)}` : src;
  return <>
  {
    isJavbus ? (
      <LazyImage src={proxiedSrc} alt={alt} className="object-cover w-full h-full" />
    ) : (
      <LazyImage src={src} alt={alt} className="object-cover w-full h-full" />
    )
  }
  </>;
}