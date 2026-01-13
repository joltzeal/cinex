import { logger } from '@/lib/logger';
import { createReadStream, existsSync, readFileSync, statSync } from 'fs';
import mime from 'mime-types';
import { NextRequest, NextResponse } from 'next/server';
import { resolve } from 'path';
// 移除 ffmpeg 依赖，使用前端生成预览图

// 生成占位图 - 使用简单的 SVG 转 JPEG
async function generatePlaceholderImage(): Promise<Buffer> {
  // 创建一个简单的 SVG 占位图
  const svg = `
    <svg width="320" height="240" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="240" fill="#1f2937"/>
      <text x="160" y="120" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af" text-anchor="middle">视频预览</text>
      <text x="160" y="140" font-family="Arial, sans-serif" font-size="14" fill="#6b7280" text-anchor="middle">点击播放</text>
    </svg>
  `;

  // 将 SVG 转换为 Buffer
  return Buffer.from(svg, 'utf-8');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // 构建文件路径，正确处理URL编码
    const pathArray = (await params).path;
    const filePath = pathArray
      .map(segment => decodeURIComponent(segment))
      .join('/');

    // 解析完整的文件路径（相对于项目根目录）
    const fullPath = resolve(process.cwd(), 'media', filePath);

    // 安全检查：确保文件路径在项目目录内
    const projectRoot = resolve(process.cwd(), 'media');
    if (!fullPath.startsWith(projectRoot)) {
      return NextResponse.json(
        { error: '非法的文件路径' },
        { status: 403 }
      );
    }

    // 检查文件是否存在
    if (!existsSync(fullPath)) {
      return NextResponse.json(
        { error: '文件不存在' },
        { status: 404 }
      );
    }

    // 获取文件统计信息
    const stats = statSync(fullPath);

    // 确保是文件而不是目录
    if (!stats.isFile()) {
      return NextResponse.json(
        { error: '路径不是文件' },
        { status: 400 }
      );
    }

    // 读取文件


    // 2. MIME 类型和参数处理 (保持不变)
    const mimeType = mime.lookup(fullPath) || 'application/octet-stream';
    // 检查参数
    const searchParams = request.nextUrl.searchParams;
    const forceDownload = searchParams.get('download') === 'true';
    const thumbnail = searchParams.get('thumbnail') === 'true';

    // 如果是视频预览图请求，直接返回占位图
    if (thumbnail && mimeType.startsWith('video/')) {
      logger.info(`生成视频预览图占位图: ${filePath}`);
      const placeholderImage = await generatePlaceholderImage();
      const headers = new Headers();
      headers.set('Content-Type', 'image/svg+xml');
      headers.set('Content-Length', placeholderImage.length.toString());
      headers.set('Cache-Control', 'public, max-age=3600');

      return new NextResponse(new Uint8Array(placeholderImage), {
        status: 200,
        headers
      });
    }

    if (mimeType.startsWith('video/')) {
      const range = request.headers.get('range');
      const fileSize = stats.size;

      if (range) {
        // 如果有 Range 请求头，说明浏览器在请求视频的某个片段
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        // 设置一个合理的块大小，防止请求过大
        const chunksize = (end - start) + 1;

        // 创建文件读取流，只读取请求的片段
        const stream = createReadStream(fullPath, { start, end });

        const headers = new Headers();
        headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        headers.set('Accept-Ranges', 'bytes');
        headers.set('Content-Length', chunksize.toString());
        headers.set('Content-Type', mimeType);

        // 返回 206 Partial Content 状态码
        return new NextResponse(stream as any, {
          status: 206,
          headers
        });
      } else {
        // 如果没有 Range 请求头，这是视频的首次请求
        const headers = new Headers();
        headers.set('Content-Length', fileSize.toString());
        headers.set('Content-Type', mimeType);
        // 告诉浏览器，我们支持 Range 请求
        headers.set('Accept-Ranges', 'bytes');

        // 首次请求可以只发送头部，或者发送整个文件（如果较小）
        // 这里我们选择流式传输整个文件
        const stream = createReadStream(fullPath);
        return new NextResponse(stream as any, {
          status: 200, // 首次请求是 200 OK
          headers
        });
      }
    }
    

    // 对于非视频文件，或需要强制下载的视频，使用原有的逻辑
    const fileBuffer = readFileSync(fullPath);
    const headers = new Headers();
    headers.set('Content-Type', mimeType);
    headers.set('Content-Length', stats.size.toString());
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    // 如果强制下载或者文件类型不是可内联显示的类型
    if (forceDownload) {
      const fileName = filePath.split('/').pop() || 'download';
      // 安全地设置文件名，避免编码问题
      try {
        const safeFileName = encodeURIComponent(fileName);
        headers.set('Content-Disposition', `attachment; filename*=UTF-8''${safeFileName}`);
      } catch (error) {
        // 如果编码失败，使用简单的文件名
        headers.set('Content-Disposition', `attachment; filename="download"`);
      }
    } else if (mimeType.startsWith('image/') || mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
      headers.set('Content-Disposition', 'inline');
    } else {
      // 其他文件类型设置为下载
      const fileName = filePath.split('/').pop() || 'download';
      try {
        const safeFileName = encodeURIComponent(fileName);
        headers.set('Content-Disposition', `attachment; filename*=UTF-8''${safeFileName}`);
      } catch (error) {
        // 如果编码失败，使用简单的文件名
        headers.set('Content-Disposition', `attachment; filename="download"`);
      }
    }

    // 将 Buffer 转换为 Uint8Array，确保兼容 NextResponse
    const uint8Array = new Uint8Array(fileBuffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers
    });
  } catch (error) {
    logger.error(`读取媒体文件失败:${error}`,);
    return NextResponse.json(
      {
        error: '读取文件失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}