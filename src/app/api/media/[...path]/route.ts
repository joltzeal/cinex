// src/app/api/media/[...path]/route.ts - 媒体文件访问API
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, resolve } from 'path';
import mime from 'mime-types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // 构建文件路径
    const filePath = (await params).path.join('/');
    
    // 解析完整的文件路径（相对于项目根目录）
    const fullPath = resolve(process.cwd(), filePath);
    
    // 安全检查：确保文件路径在项目目录内
    const projectRoot = resolve(process.cwd());
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
    const fileBuffer = readFileSync(fullPath);
    
    // 获取 MIME 类型
    const mimeType = mime.lookup(fullPath) || 'application/octet-stream';
    
    // 设置响应头
    const headers = new Headers();
    headers.set('Content-Type', mimeType);
    headers.set('Content-Length', stats.size.toString());
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    
    // 如果是图片、视频或音频，设置为内联显示
    if (mimeType.startsWith('image/') || mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
      headers.set('Content-Disposition', 'inline');
    } else {
      // 其他文件类型设置为下载
      const fileName = filePath.split('/').pop() || 'download';
      headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
    }

    // 将 Buffer 转换为 Uint8Array，确保兼容 NextResponse
    const uint8Array = new Uint8Array(fileBuffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('读取媒体文件失败:', error);
    return NextResponse.json(
      { 
        error: '读取文件失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}