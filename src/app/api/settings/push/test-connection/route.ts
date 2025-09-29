import { NextRequest, NextResponse } from 'next/server';
import { PushNotificationService } from '@/lib/push-notification';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, username, token } = body;

    // 验证必填字段
    if (!domain || !username) {
      return NextResponse.json(
        { success: false, message: '域名和用户名不能为空' },
        { status: 400 }
      );
    }

    // 创建推送服务实例
    const pushService = new PushNotificationService({
      domain,
      username,
      token
    });

    // 发送测试消息
    const result = await pushService.sendTestMessage();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: '测试消息发送成功！'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message || '测试消息发送失败'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('推送测试连接失败:', error);
    
    // 检查是否是网络连接错误
    if (error instanceof Error && error.message.includes('fetch failed')) {
      return NextResponse.json(
        { 
          success: false, 
          message: '网络连接失败，请检查推送服务域名是否正确或网络连接是否正常' 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: `测试连接失败: ${error instanceof Error ? error.message : '未知错误'}` 
      },
      { status: 500 }
    );
  }
}
