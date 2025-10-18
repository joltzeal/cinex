import { NextRequest, NextResponse } from 'next/server';
import { unlink, rm, existsSync, statSync } from 'fs';
import { promisify } from 'util';
import { resolve } from 'path';

const unlinkAsync = promisify(unlink);
const rmAsync = promisify(rm);

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: filePath, isDirectory } = body;

    if (!filePath) {
      return NextResponse.json(
        { error: '缺少文件路径' },
        { status: 400 }
      );
    }

    // 解析完整的文件路径（相对于项目根目录）
    const fullPath = resolve(process.cwd(),'media', filePath);
    
    // 安全检查：确保文件路径在项目目录内
    const projectRoot = resolve(process.cwd(),'media');
    if (!fullPath.startsWith(projectRoot)) {
      return NextResponse.json(
        { error: '非法的文件路径' },
        { status: 403 }
      );
    }

    // 检查文件/目录是否存在
    if (!existsSync(fullPath)) {
      return NextResponse.json(
        { error: '文件或目录不存在' },
        { status: 404 }
      );
    }

    // 获取文件统计信息
    const stats = statSync(fullPath);

    // 删除文件或目录
    if (isDirectory || stats.isDirectory()) {
      // 递归删除目录
      await rmAsync(fullPath, { recursive: true, force: true });
      return NextResponse.json(
        { message: '目录删除成功', path: filePath },
        { status: 200 }
      );
    } else {
      // 删除文件
      await unlinkAsync(fullPath);
      return NextResponse.json(
        { message: '文件删除成功', path: filePath },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('删除文件失败:', error);
    return NextResponse.json(
      { 
        error: '删除文件失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

