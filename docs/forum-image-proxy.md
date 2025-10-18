# 论坛图片代理解决方案

## 问题描述

在渲染论坛帖子内容时，某些论坛（如色花堂、javbus 等）的图片由于防盗链或 CORS 限制，无法直接在前端显示。

## 解决方案

实现了一套完整的服务器端图片代理系统，自动处理需要代理的图片请求。

### 核心组件

#### 1. 内容处理器 (`/src/lib/forum-content-processor.ts`)

负责解析和修改 HTML 内容中的图片 URL。

**主要功能：**
- 自动检测需要代理的图片域名
- 替换图片 `src` 为代理 URL
- 支持 `srcset` 属性
- 支持 CSS 背景图片
- 保留原始 URL 作为 `data-original-src` 属性

**使用示例：**
```typescript
import { processForumContent } from '@/lib/forum-content-processor';

// 处理单个内容
const processedHtml = processForumContent(post.content, 'sehuatang');

// 批量处理
const processed = batchProcessForumContent([
  { content: html1, forumId: 'sehuatang' },
  { content: html2, forumId: 'javbus' },
]);
```

#### 2. 代理 API 端点 (`/src/app/api/forum/[forumId]/proxy/route.ts`)

提供图片代理服务。

**端点格式：**
```
GET /api/forum/{forumId}/proxy?url={encodedImageUrl}
```

**示例：**
```
GET /api/forum/sehuatang/proxy?url=https%3A%2F%2Ftu.ymawv.la%2Ftupian%2Fforum%2F202510%2F15%2F075401y5rv3agr7aas0s3v.jpg
```

**特性：**
- 根据不同论坛设置适当的请求头
- 自动添加 Referer 头
- 长期缓存（1 年）
- 错误处理和日志记录

### 配置

#### 添加需要代理的域名

在 `/src/lib/forum-content-processor.ts` 中配置：

```typescript
const PROXY_DOMAINS: Record<string, string[]> = {
  'sehuatang': [
    'www.sehuatang.net',
    'tu.ymawv.la',
    // 添加更多域名
  ],
  'javbus': [
    'www.javbus.com',
    'pics.javbus.com',
  ],
  '2048': [
    'hjd2048.com',
  ],
};
```

#### 自定义请求头

在 `/src/app/api/forum/[forumId]/proxy/route.ts` 中修改：

```typescript
if (forumId === 'your-forum') {
  headers['Referer'] = 'https://your-forum.com/';
  headers['Cookie'] = 'your-cookie';
}
```

### 工作流程

1. **服务器端处理：**
   ```
   原始 HTML → cheerio 解析 → 检测图片域名 → 替换为代理 URL → 返回处理后的 HTML
   ```

2. **浏览器渲染：**
   ```
   处理后的 HTML → 浏览器请求图片 → 代理 API → 获取原始图片 → 返回给浏览器
   ```

3. **示例转换：**
   
   **原始 HTML：**
   ```html
   <img src="https://tu.ymawv.la/tupian/forum/202510/15/image.jpg">
   ```
   
   **处理后的 HTML：**
   ```html
   <img 
     src="/api/forum/sehuatang/proxy?url=https%3A%2F%2Ftu.ymawv.la%2Ftupian%2Fforum%2F202510%2F15%2Fimage.jpg" 
     data-original-src="https://tu.ymawv.la/tupian/forum/202510/15/image.jpg"
   >
   ```

### 优势

1. **自动化：** 无需手动处理每个图片
2. **灵活：** 支持多种图片引用方式（img、background-image、srcset）
3. **性能：** 浏览器端长期缓存
4. **可维护：** 集中管理代理配置
5. **向后兼容：** 处理失败时返回原始内容

### 支持的图片格式

- `<img src="...">`
- `<img srcset="...">`
- `<div style="background-image: url(...)">`
- CSS 内联样式中的 `url()` 引用

### 调试

查看处理后的图片可以检查 `data-original-src` 属性：

```javascript
// 浏览器控制台
document.querySelectorAll('img[data-original-src]').forEach(img => {
  console.log({
    original: img.dataset.originalSrc,
    proxied: img.src
  });
});
```

### 注意事项

1. **缓存策略：** 代理的图片会被浏览器缓存 1 年，如需更新需清除缓存
2. **带宽消耗：** 所有代理请求都会经过你的服务器
3. **性能考虑：** 建议在 API 端使用 CDN 或图片缓存服务
4. **安全性：** 验证 URL 格式，防止 SSRF 攻击

### 扩展

#### 添加图片缓存

可以在代理 API 中添加本地缓存或使用 Redis：

```typescript
// 伪代码
const cached = await redis.get(imageUrl);
if (cached) {
  return new NextResponse(cached);
}

const imageBuffer = await fetchImage(imageUrl);
await redis.set(imageUrl, imageBuffer, { ex: 86400 }); // 缓存 24 小时
```

#### 添加图片优化

集成图片优化库（如 sharp）：

```typescript
import sharp from 'sharp';

const optimized = await sharp(imageBuffer)
  .resize(1200) // 最大宽度
  .webp({ quality: 80 }) // 转换为 WebP
  .toBuffer();
```

## 使用示例

### 在组件中使用

```typescript
import { processForumContent } from '@/lib/forum-content-processor';

export function PostContent({ post }: { post: ForumPost }) {
  const processedContent = processForumContent(
    post.content, 
    post.forumSubscribe.forum
  );
  
  return (
    <div 
      dangerouslySetInnerHTML={{ __html: processedContent || '' }}
    />
  );
}
```

### 在 API 路由中使用

```typescript
import { processForumContent } from '@/lib/forum-content-processor';

export async function GET() {
  const post = await db.forumPost.findUnique({ ... });
  
  return NextResponse.json({
    ...post,
    content: processForumContent(post.content, post.forum),
  });
}
```

