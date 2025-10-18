# 全局 Lightbox 使用指南

## 概述

全局 Lightbox Provider 已经在应用根布局中配置完成，可以在任何组件中使用，包括在 Dialog、Modal 等组件内部使用，不会产生冲突。

## 特性

- ✅ 全局单例，渲染在 `document.body`，z-index 最高
- ✅ 在任何 Dialog 中使用都不会相互影响
- ✅ 支持图片切换（左右箭头键或按钮）
- ✅ 支持 ESC 键关闭
- ✅ 自动显示图片计数器
- ✅ 简单易用的 Hook API

## 使用方法

### 1. 基础用法

```tsx
import { useGlobalLightbox } from "@/components/global-lightbox-provider";

function MyComponent() {
  const { openLightbox } = useGlobalLightbox();
  
  const images = [
    { src: "https://example.com/image1.jpg", alt: "Image 1" },
    { src: "https://example.com/image2.jpg", alt: "Image 2" },
    { src: "https://example.com/image3.jpg", alt: "Image 3" },
  ];
  
  return (
    <div>
      {images.map((image, index) => (
        <img
          key={index}
          src={image.src}
          alt={image.alt}
          onClick={() => openLightbox(images, index)}
          className="cursor-pointer"
        />
      ))}
    </div>
  );
}
```

### 2. 在 Dialog 中使用

```tsx
import { useGlobalLightbox } from "@/components/global-lightbox-provider";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

function MovieDialog() {
  const { openLightbox } = useGlobalLightbox();
  
  const screenshots = [
    { src: "/screenshot1.jpg" },
    { src: "/screenshot2.jpg" },
    { src: "/screenshot3.jpg" },
  ];
  
  return (
    <Dialog>
      <DialogTrigger>打开详情</DialogTrigger>
      <DialogContent>
        <div className="flex gap-2">
          {screenshots.map((screenshot, index) => (
            <img
              key={index}
              src={screenshot.src}
              onClick={() => openLightbox(screenshots, index)}
              className="cursor-pointer hover:opacity-80"
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 3. 带代理的图片 URL

```tsx
const proxyImageUrl = (url: string) => {
  return `/api/proxy?url=${encodeURIComponent(url)}`;
};

function MyComponent() {
  const { openLightbox } = useGlobalLightbox();
  
  const samples = [
    { id: 1, src: "https://external.com/img1.jpg", alt: "Sample 1" },
    { id: 2, src: "https://external.com/img2.jpg", alt: "Sample 2" },
  ];
  
  // 准备 Lightbox slides
  const lightboxSlides = samples.map(sample => ({
    src: proxyImageUrl(sample.src),
    alt: sample.alt
  }));
  
  return (
    <div className="flex gap-4">
      {samples.map((sample, index) => (
        <img
          key={sample.id}
          src={proxyImageUrl(sample.src)}
          alt={sample.alt}
          onClick={() => openLightbox(lightboxSlides, index)}
          className="cursor-pointer"
        />
      ))}
    </div>
  );
}
```

### 4. 使用 useMemo 优化

```tsx
import { useMemo } from "react";
import { useGlobalLightbox } from "@/components/global-lightbox-provider";

function OptimizedComponent({ images }: { images: Array<{ url: string }> }) {
  const { openLightbox } = useGlobalLightbox();
  
  // 缓存 slides，避免每次渲染重新计算
  const lightboxSlides = useMemo(() => {
    return images.map(img => ({
      src: img.url,
    }));
  }, [images]);
  
  return (
    <div>
      {images.map((img, index) => (
        <img
          key={index}
          src={img.url}
          onClick={() => openLightbox(lightboxSlides, index)}
        />
      ))}
    </div>
  );
}
```

## API 参考

### `useGlobalLightbox()`

返回一个对象，包含以下方法：

#### `openLightbox(slides, initialIndex?)`

打开 Lightbox 并显示指定的图片。

**参数：**
- `slides`: `LightboxSlide[]` - 图片数组
  - `src`: `string` - 图片 URL（必需）
  - `alt`: `string` - 图片描述（可选）
- `initialIndex`: `number` - 初始显示的图片索引，默认为 0（可选）

**示例：**
```tsx
openLightbox([{ src: "/image1.jpg" }, { src: "/image2.jpg" }], 1);
```

#### `closeLightbox()`

关闭 Lightbox（通常不需要手动调用，用户按 ESC 或点击关闭按钮会自动关闭）。

## 常见场景

### 场景 1: 产品图库
```tsx
function ProductGallery({ product }) {
  const { openLightbox } = useGlobalLightbox();
  
  return (
    <div className="grid grid-cols-4 gap-2">
      {product.images.map((img, idx) => (
        <img
          src={img.thumbnail}
          onClick={() => openLightbox(
            product.images.map(i => ({ src: i.fullSize })),
            idx
          )}
        />
      ))}
    </div>
  );
}
```

### 场景 2: 视频截图预览
```tsx
function VideoScreenshots({ screenshots }) {
  const { openLightbox } = useGlobalLightbox();
  
  const slides = screenshots.map(s => ({
    src: s.url,
    alt: `Screenshot at ${s.timestamp}`
  }));
  
  return (
    <ScrollArea>
      {screenshots.map((s, i) => (
        <img src={s.url} onClick={() => openLightbox(slides, i)} />
      ))}
    </ScrollArea>
  );
}
```

### 场景 3: 多个 Dialog 同时存在
```tsx
// Dialog A
function DialogA() {
  const { openLightbox } = useGlobalLightbox();
  // ... 使用 openLightbox
}

// Dialog B
function DialogB() {
  const { openLightbox } = useGlobalLightbox();
  // ... 使用 openLightbox
}

// 两个 Dialog 中的 Lightbox 互不影响，都使用同一个全局实例
```

## 注意事项

1. **自动配置**：无需在组件中导入 Provider，已在应用根布局配置
2. **性能优化**：使用 `useMemo` 缓存 slides 数组，避免不必要的重新计算
3. **图片加载**：确保图片 URL 可访问，代理 URL 已正确配置
4. **可访问性**：建议为图片提供 `alt` 属性

## 工作原理

全局 Lightbox 通过 `createPortal` 将 Lightbox 组件渲染到 `document.body`，确保：
- 始终在最顶层显示（z-index 最高）
- 不受父组件 DOM 结构限制
- 与 Dialog、Modal 等组件隔离，互不影响
- 全局单例，减少资源占用

## 相关文件

- `/src/components/global-lightbox-provider.tsx` - Provider 实现
- `/src/app/layout.tsx` - Provider 配置
- `/src/components/search/movie-detail.tsx` - 使用示例

