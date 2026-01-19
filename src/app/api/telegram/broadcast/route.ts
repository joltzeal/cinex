import { broadcastMessage } from '@/lib/telegram';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const message = await request.json();
    
    // 验证消息格式
    if (!message.type) {
      return NextResponse.json(
        { error: '消息必须包含type字段' },
        { status: 400 }
      );
    }
    
    // 广播消息
    broadcastMessage(message);
    
    return NextResponse.json({ 
      success: true,
      message: '消息已广播'
    });
  } catch (error) {
    console.error('广播消息失败:', error);
    return NextResponse.json(
      { error: '广播失败' },
      { status: 500 }
    );
  }
}
