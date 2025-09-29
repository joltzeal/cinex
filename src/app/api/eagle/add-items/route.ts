import { NextRequest, NextResponse } from 'next/server';

interface EagleItem {
  url: string;
  name: string;
  website?: string;
  tags?: string[];
  modificationTime?: number;
  headers?: {
    referer?: string;
  };
}

interface EagleRequest {
  items: EagleItem[];
  folderId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: EagleRequest = await request.json();
    
    // 验证请求数据
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, message: '请求数据无效：items 不能为空' },
        { status: 400 }
      );
    }

    // 构建 Eagle API 请求数据
    const eagleData = {
      items: body.items,
      folderId: body.folderId || "TELEGRAM_IMPORTS"
    };

    console.log('向 Eagle 发送请求:', JSON.stringify(eagleData, null, 2));

    // 向 Eagle API 发送请求
    const eagleResponse = await fetch('http://localhost:41595/api/item/addFromURLs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eagleData),
    });

    if (!eagleResponse.ok) {
      console.error('Eagle API 响应错误:', eagleResponse.status, eagleResponse.statusText);
      return NextResponse.json(
        { 
          success: false, 
          message: `Eagle API 请求失败: ${eagleResponse.status} ${eagleResponse.statusText}` 
        },
        { status: 502 }
      );
    }

    const eagleResult = await eagleResponse.json();
    console.log('Eagle API 响应:', eagleResult);

    // 检查 Eagle 响应状态
    if (eagleResult.status === 'success') {
      return NextResponse.json({
        success: true,
        message: `成功添加 ${body.items.length} 个文件到 Eagle`,
        data: eagleResult
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: eagleResult.message || 'Eagle 处理失败',
          data: eagleResult
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Eagle API 代理错误:', error);
    
    // 检查是否是网络连接错误（Eagle 未运行）
    if (error instanceof Error && (
      error.message.includes('ECONNREFUSED') || 
      error.message.includes('fetch failed') ||
      error.message.includes('connect ECONNREFUSED')
    )) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Eagle 应用未运行或无法连接，请确保 Eagle 应用已启动' 
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: '服务器内部错误: ' + (error instanceof Error ? error.message : '未知错误')
      },
      { status: 500 }
    );
  }
}
