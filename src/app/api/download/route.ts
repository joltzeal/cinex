import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { downloadImmediatelyTask, downloadMain } from "@/lib/download";
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const downloadURLsRaw = formData.get("downloadURLs") as string | null;
    const downloadImmediately = formData.get("downloadImmediately") === "true";

    const movieDetail = JSON.parse(formData.get("movie") as string || 'null');

    const newDocumentInsert = await downloadMain({
      urls: JSON.parse(downloadURLsRaw || '[]'),
      title: formData.get("title") as string | null,
      description: formData.get("description") as string | null,
      movie: movieDetail,
      downloadImmediately: downloadImmediately,
      images: formData.getAll("images") as File[],
    })

    if (!downloadImmediately) {
      return NextResponse.json({ message: "文档创建成功！", document: newDocumentInsert }, { status: 201 });
    }
    const taskId = uuidv4();
    setTimeout(() => {
      downloadImmediatelyTask(taskId, newDocumentInsert, movieDetail);
    }, 2000); // 增加延迟时间，确保 SSE 连接建立
    return NextResponse.json({
      message: "下载任务已启动",
      taskId: taskId,
      document: newDocumentInsert
    }, { status: 202 });


  } catch (error: any) {
    console.error("Error during document creation process:", error);
    if (error instanceof TypeError) {
      return NextResponse.json(
        { message: error.message },
        { status: 409 }
      );
    }
    if (error instanceof Error) {
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "服务器内部错误", error: (error as Error).message },
      { status: 500 }
    );
  }
}
