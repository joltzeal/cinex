import { NextRequest, NextResponse } from 'next/server';
import { getBotStatus, startBotService, stopBotService, restartBotService } from '@/lib/bot-manager';

// GET - 获取Bot状态
export async function GET(request: NextRequest) {
  try {
    const status = await getBotStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('获取Bot状态失败:', error);
    return NextResponse.json(
      { error: '获取状态失败' }, 
      { status: 500 }
    );
  }
}

// POST - 控制Bot服务
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (!action || !['start', 'stop', 'restart'].includes(action)) {
      return NextResponse.json(
        { error: '无效的操作，支持: start, stop, restart' },
        { status: 400 }
      );
    }

    let result;
    switch (action) {
      case 'start':
        result = await startBotService();
        break;
      case 'stop':
        result = await stopBotService();
        break;
      case 'restart':
        result = await restartBotService();
        break;
      default:
        return NextResponse.json(
          { error: '无效的操作' },
          { status: 400 }
        );
    }

    if (result && result.success) {
      return NextResponse.json({
        success: true,
        message: result.message
      });
    } else {
      return NextResponse.json(
        { error: result?.message || '操作失败' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('控制Bot服务失败:', error);
    return NextResponse.json(
      { error: '操作失败' },
      { status: 500 }
    );
  }
}
