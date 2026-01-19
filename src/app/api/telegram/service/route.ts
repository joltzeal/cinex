import { NextRequest, NextResponse } from 'next/server';
import telegramBot from '@/lib/bot'; // Import the singleton instance
import { logger } from '@/lib/logger';

// GET - 获取Bot状态
export async function GET(request: NextRequest) {
  try {
    const status = telegramBot.getStatus();
    // example: {running: false,configured: false}
    return NextResponse.json(status);
  } catch (error) {
    logger.error(`获取Bot状态失败:${error}`);
    return NextResponse.json(
      { error: '获取状态失败' },
      { status: 500 }
    );
  }
}

// // POST - 控制Bot服务
export async function POST(request: NextRequest) {
  const { action } = await request.json();
  switch (action) {
    case 'start':
      try {
        const success = await telegramBot.start();
        if (success) {
          return NextResponse.json({ message: 'Telegram bot 启动成功' });
        } else {
          return NextResponse.json({ error: 'Telegram bot 启动失败' });
        }
      } catch (error: any) {
        return NextResponse.json({ error: error.message });
      }

    case 'stop':
      try {
        await telegramBot.stop();
        return NextResponse.json({ message: 'Telegram bot 停止成功' });
      } catch (error: any) {
        return NextResponse.json({ error: error.message });
      }

    case 'restart':
      const success = await telegramBot.restart();
      if (success) {
        return NextResponse.json({ message: 'Telegram bot 重启成功' });
      } else {
        return NextResponse.json({ error: 'Telegram bot 重启失败' });
      }

    default:
      return NextResponse.json({ error: '无效的操作' });
  }
}
