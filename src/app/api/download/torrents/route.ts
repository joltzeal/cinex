// app/api/torrents/route.ts
import { getActiveClient } from "@/features/download/downloader/manager";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    
    const body = await req.json();
    
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: "请求体中必须包含 'url' 字段。" }, { status: 400 });
    }

    // 简单验证是否是 magnet 链接或 http/https 链接
    if (!url.startsWith('magnet:') && !url.startsWith('http')) {
      return NextResponse.json({ error: "无效的链接格式。" }, { status: 400 });
    }

    const client = await getActiveClient();
    const result = await client.addTorrent(url);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ error: result.message }, { status: 502 }); // 502 Bad Gateway
    }

  } catch (error) {
    console.log(error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    console.error("[API_ADD_TORRENT_ERROR]", errorMessage);

    // 根据错误类型返回不同的状态码
    if (errorMessage.includes("没有启用")) {
      return NextResponse.json({ error: errorMessage }, { status: 409 }); // 409 Conflict
    }
    if (errorMessage.includes("未配置")) {
      return NextResponse.json({ error: errorMessage }, { status: 409 });
    }

    return NextResponse.json({ error: `服务器内部错误: ${errorMessage}` }, { status: 500 });
  }
}

export async function GET() {
  try {
    const client = await getActiveClient();
    const torrents = await client.getTorrents();
    return NextResponse.json(torrents);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    console.error("[API_LIST_TORRENTS_ERROR]", errorMessage);

    if (errorMessage.includes("没有启用") || errorMessage.includes("未配置")) {
      return NextResponse.json({ error: errorMessage }, { status: 409 }); // 409 Conflict
    }

    return NextResponse.json({ error: `服务器内部错误: ${errorMessage}` }, { status: 500 });
  }
}