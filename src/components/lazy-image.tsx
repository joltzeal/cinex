import { useEffect, useRef, useState } from 'react';

export function LazyImage({
  src,
  alt,
  className,
  fallbackText = 'No Image'
}: {
  src: string;
  alt: string;
  className: string;
  fallbackText?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const element = imgRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '100px', threshold: 0.01 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = (
    error: React.SyntheticEvent<HTMLImageElement, Event>
  ) => {
    console.log(error);
    setHasError(true);
  };

  // 如果没有 src 或 src 为空，直接显示 fallback
  if (!src || src.trim() === '') {
    return (
      <div
        className={`${className} text-muted-foreground bg-muted flex items-center justify-center text-xs`}
      >
        {fallbackText}
      </div>
    );
  }

  // 如果还没有进入视口，显示占位符
  if (!isVisible) {
    return (
      <div ref={imgRef} className={`${className} bg-muted animate-pulse`} />
    );
  }

  // 如果加载出错，显示错误状态
  if (hasError) {
    return (
      <div
        className={`${className} text-muted-foreground bg-muted flex items-center justify-center text-xs`}
      >
        加载失败
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      rel='noreferrer'
      onLoad={handleLoad}
      onError={handleError}
      ref={imgRef}
    />
  );
}
