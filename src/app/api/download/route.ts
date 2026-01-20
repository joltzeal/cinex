import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { createDownload, downloadImmediatelyTask } from "@/lib/download";
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    console.log(formData);
    const downloadURLsRaw = formData.get("downloadURLs") as string | null;
    if (!downloadURLsRaw || JSON.parse(downloadURLsRaw).length === 0) {
      return NextResponse.json({ message: "请添加下载链接" }, { status: 400 });
    }
    const urls = JSON.parse(downloadURLsRaw);
    const downloadImmediately = formData.get("downloadImmediately") === "true";
    let images;
    let _images = formData.get("images");
    if (_images && JSON.parse(_images as string).length > 0) {
      images = JSON.parse(_images as string) as string[]
    } else {
    }

    const document = await createDownload({
      urls: urls,
      images: images,
      movieId: formData.get("movieId") as string | null,
      downloadImmediately: downloadImmediately,
      title: formData.get("title") as string | null,
      description: formData.get("description") as string | null,
    });
    if (!downloadImmediately) {
      return NextResponse.json({ message: "文档创建成功！", document: document }, { status: 201 });
    }
    const taskId = uuidv4();
    setTimeout(() => {
      downloadImmediatelyTask(taskId, document, formData.get("movieId") as string | null,);
    }, 2000); // 增加延迟时间，确保 SSE 连接建立
    return NextResponse.json({
      message: "下载任务已启动",
      taskId: taskId,
      document: document
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
  // try {
  //   const formData = await request.formData();

  //   const downloadURLsRaw = formData.get("downloadURLs") as string | null;
  //   const downloadImmediately = formData.get("downloadImmediately") === "true";

  //   const movieDetail = JSON.parse(formData.get("movie") as string || 'null');

  //   const newDocumentInsert = await downloadMain({
  //     urls: JSON.parse(downloadURLsRaw || '[]'),
  //     title: formData.get("title") as string | null,
  //     description: formData.get("description") as string | null,
  //     movie: movieDetail,
  //     downloadImmediately: downloadImmediately,
  //     images: formData.getAll("images") as File[],
  //   })

  //   if (!downloadImmediately) {
  //     return NextResponse.json({ message: "文档创建成功！", document: newDocumentInsert }, { status: 201 });
  //   }
  //   const taskId = uuidv4();
  //   setTimeout(() => {
  //     downloadImmediatelyTask(taskId, newDocumentInsert, movieDetail);
  //   }, 2000); // 增加延迟时间，确保 SSE 连接建立
  //   return NextResponse.json({
  //     message: "下载任务已启动",
  //     taskId: taskId,
  //     document: newDocumentInsert
  //   }, { status: 202 });


  // } catch (error: any) {
  //   console.error("Error during document creation process:", error);
  //   if (error instanceof TypeError) {
  //     return NextResponse.json(
  //       { message: error.message },
  //       { status: 409 }
  //     );
  //   }
  //   if (error instanceof Error) {
  //     return NextResponse.json(
  //       { message: error.message },
  //       { status: 500 }
  //     );
  //   }

  //   return NextResponse.json(
  //     { message: "服务器内部错误", error: (error as Error).message },
  //     { status: 500 }
  //   );
  // }
}
