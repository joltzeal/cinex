import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { getSetting, SettingKey, upsertSetting } from '@/services/settings';

const downloadDirectoryConfigSchema = z.object({
  movie: z.string().min(1, '电影目录名称不能为空'),
  magnet: z.string().min(1, '磁力目录名称不能为空'),
  telegram: z.string().min(1, 'Telegram目录名称不能为空'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const config = downloadDirectoryConfigSchema.parse(body);


    await upsertSetting(SettingKey.DirectoryConfig, config);

    // 获取downloads目录路径
    const downloadPath = path.resolve('./media');
    console.log('下载目录路径:', downloadPath);
    console.log('当前工作目录:', process.cwd());

    // 创建目录（如果不存在）
    const directories = [
      config.movie,
      config.magnet,
      config.telegram
    ];

    for (const dirName of directories) {
      const dirPath = path.join(downloadPath, dirName);
      console.log('尝试创建目录:', dirPath);
      try {
        await fs.access(dirPath);
        console.log(`目录已存在: ${dirPath}`);
      } catch {
        // 目录不存在，创建它
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`创建目录: ${dirPath}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: '下载目录设置已保存并创建相应目录'
    });

  } catch (error) {
    console.error('保存下载目录设置失败:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '输入数据验证失败', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '保存设置失败' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const setting = await getSetting(SettingKey.DirectoryConfig);

    if (!setting) {
      return NextResponse.json(null);
    }

    return NextResponse.json(setting);
  } catch (error) {
    console.error('获取下载目录设置失败:', error);
    return NextResponse.json(
      { error: '获取设置失败' },
      { status: 500 }
    );
  }
}
