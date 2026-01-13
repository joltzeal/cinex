import { NextResponse } from 'next/server';
import { WhatslinkPreview } from '@/lib/magnet/link-preview';
import {  isMagnetLink  } from '@/lib/magnet/magnet-helper';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const magnetLink = searchParams.get('magnet');

    if (!magnetLink  || !isMagnetLink(magnetLink) ) {
      return NextResponse.json({ error: 'Invalid magnet link' }, { status: 400 });
    }

    // 调用磁力预览
    const previewer = new WhatslinkPreview();
    const data = await previewer.getPreview(magnetLink);
    
    // 将成功获取的数据返回给客户端
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[PREVIEW API ERROR]', error);
    // 将错误信息返回给客户端
    return NextResponse.json({ error: error.message || 'Failed to fetch preview from the server.' }, { status: 500 });
  }
}