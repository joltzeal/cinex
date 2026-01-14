import { NextRequest, NextResponse } from "next/server";
import { runJavbusSubscribeUpdate, runJavbusMovieUpdate, runDownloadStatusSync, runMediaLibrarySync, runMediaScraping, runForumUpdate } from "@/lib/cron";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const taskType = body.taskType; // 默认执行每日任务
    if (!taskType) {
      return NextResponse.json({
        success: false,
        message: '任务类型不能为空',
      }, { status: 400 });
    }
    switch (taskType) {
      case 'javbus-subscribe-update':
        await runJavbusSubscribeUpdate();
        break;
      case 'javbus-movie-update':
        await runJavbusMovieUpdate();
        break;
      case 'download-status-sync':
        await runDownloadStatusSync();
        break;
      case 'media-library-sync':
        await runMediaLibrarySync();
        break;
      case 'media-scraping':
        await runMediaScraping();
        break;
      case 'forum-update':
        await runForumUpdate();
        break;
      default:
        return NextResponse.json({
          success: false,
          message: '任务类型不支持',
        }, { status: 400 });
    }
    return NextResponse.json({
      success: true,
      message: `任务 ${taskType} 执行完成`,
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? String(error)
      },
      { status: 500 }
    );
  }
}
