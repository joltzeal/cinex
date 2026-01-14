import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSetting, SettingKey } from '@/services/settings';
export async function GET() {
  try {
    // 从数据库获取推送配置

    const pushSetting = await getSetting(SettingKey.PushNotificationConfig);


    let pushConfig = {
      domain: 'not configured',
      username: 'not configured',
      token: 'not configured'
    };

    if (pushSetting) {
      const config = pushSetting as {
        domain: string;
        username: string;
        token?: string;
      };
      pushConfig = {
        domain: config.domain || 'not configured',
        username: config.username || 'not configured',
        token: config.token ? 'configured' : 'not configured'
      };
    }

    const status = {
      scheduler: {
        enabled: process.env.ENABLE_SCHEDULER === 'true' || process.env.NODE_ENV === 'production',
        environment: process.env.NODE_ENV,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
      push: pushConfig
    };

    return NextResponse.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('获取定时任务状态失败:', error);
    return NextResponse.json(
      {
        success: false,
        message: `获取状态失败: ${error instanceof Error ? error.message : '未知错误'}`
      },
      { status: 500 }
    );
  }
}
