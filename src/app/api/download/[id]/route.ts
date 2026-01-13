import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { processManualMode, processAutoMode } from "@/lib/download/download-processor";
import { ensureMagnetLink } from "@/lib/magnet/magnet-helper";
import { downloadImmediatelyTask } from "@/lib/download";
import { getDocumentDownloadById } from "@/services/download";
import { MovieDetail } from "@/types/javbus";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const formData = await request.formData();
    const downloadURLsRaw = formData.get("downloadURLs") as string | null;
    const downloadImmediately = formData.get("downloadImmediately") === "true";
    const movieDetail = JSON.parse(formData.get("movie") as string || 'null');

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const imagesEntry = formData.getAll("images");
    const images = imagesEntry.filter((item): item is File => item instanceof File);
    // 验证文档是否存在
    const existingDocument = await getDocumentDownloadById(id);

    if (!existingDocument) {
      return NextResponse.json(
        { message: "文档不存在" },
        { status: 404 }
      );
    }

    // 如果只是立即下载，不修改文档
    if (downloadImmediately && !downloadURLsRaw && !title && !description) {
      const taskId = uuidv4();
      setTimeout(() => {
        downloadImmediatelyTask(taskId, existingDocument, movieDetail);
      }, 2000);
      
      return NextResponse.json(
        { message: "下载任务已启动", taskId },
        { status: 202 }
      );
    }

    // 解析 movie 数据
    let movieData: MovieDetail | null = null;
    if (movieDetail) {
      movieData = movieDetail;
    }

    // 处理下载URLs
    let processedData = null;
    let newUrls: string[] = [];
    let existingUrlsInDoc: any[] = [];
    let urlsToAdd: string[] = [];
    let urlsToRemove: string[] = [];
    let normalizedUrlsToRemove: string[] = [];
    
    if (downloadURLsRaw) {
      newUrls = JSON.parse(downloadURLsRaw).filter((url: string) => url && url.trim() !== '');
      
      if (newUrls.length === 0) {
        return NextResponse.json({ message: "未提供有效的下载链接" }, { status: 400 });
      }

      // 获取当前文档中现有的URLs
      existingUrlsInDoc = existingDocument.downloadURLs.map((url: { url: Document }) => url.url);
      
      // 标准化URLs进行比较
      const normalizedNewUrls = newUrls.map(url => ensureMagnetLink(url));
      const normalizedExistingUrls = existingUrlsInDoc.map(url => ensureMagnetLink(url));
      
      // 找出需要新增的URLs（在新列表中但不在现有列表中）
      urlsToAdd = newUrls.filter((url, index) => {
        const normalizedUrl = normalizedNewUrls[index];
        return !normalizedExistingUrls.includes(normalizedUrl);
      });
      
      // 找出需要删除的URLs（在现有列表中但不在新列表中）
      urlsToRemove = existingUrlsInDoc.filter((url, index) => {
        const normalizedUrl = normalizedExistingUrls[index];
        return !normalizedNewUrls.includes(normalizedUrl);
      });
      
      // 保存需要删除的标准化URLs
      normalizedUrlsToRemove = urlsToRemove.map(url => ensureMagnetLink(url));
      
      // 检查新增的URLs是否在其他文档中存在
      if (urlsToAdd.length > 0) {
        const urlsToCheck = urlsToAdd.map(url => ensureMagnetLink(url));
        const existingUrlsInOtherDocs = await prisma.documentDownloadURL.findMany({
          where: {
            url: { in: urlsToCheck },
            documentId: { not: id }, // 排除当前文档
          },
          select: { url: true },
        });

        if (existingUrlsInOtherDocs.length > 0) {
          const duplicateUrls = existingUrlsInOtherDocs.map((item: { url: any; }) => item.url);
          const errorMessages = duplicateUrls.map((duplicateUrl: string) => {
            const index = urlsToCheck.findIndex(url => url === duplicateUrl) + 1;
            const displayUrl = duplicateUrl.length > 50 ? `${duplicateUrl.substring(0, 50)}...` : duplicateUrl;
            return `第 ${index} 条链接: "${displayUrl}" 已存在于其他文档中`;
          });

          return NextResponse.json(
            { message: `以下链接已添加过，请勿重复提交：\n${errorMessages.join('\n')}` },
            { status: 409 }
          );
        }
      }
      
      // 处理需要新增的URL数据
      if (urlsToAdd.length > 0) {
        if (title) {
          processedData = await processManualMode(urlsToAdd, title, images);
        } else {
          processedData = await processAutoMode(urlsToAdd);
        }
      }
      
      console.log(`URL更新计划: 新增 ${urlsToAdd.length} 个，删除 ${urlsToRemove.length} 个`);
    }

    // 开始事务
    await prisma.$transaction(async (tx: any) => {
      // 更新文档基本信息
      const updateData: any = {};
      if (title !== null) updateData.title = title;
      if (description !== null) updateData.description = description;
      
      if (Object.keys(updateData).length > 0) {
        await tx.document.update({
          where: { id: id },
          data: updateData,
        });
      }

      // 处理下载URLs的增量更新
      if (downloadURLsRaw) {
        // 删除不再需要的URLs
        if (urlsToRemove.length > 0) {
          await tx.documentDownloadURL.deleteMany({
            where: {
              documentId: id,
              url: { in: normalizedUrlsToRemove }
            },
          });
          console.log(`删除了 ${urlsToRemove.length} 个不再需要的下载链接`);
        }
        
        // 添加新的URLs
        if (processedData && processedData.downloadUrlData.length > 0) {
          await tx.documentDownloadURL.createMany({
            data: processedData.downloadUrlData.map(item => ({
              documentId: id,
              url: item.url,
              status: 'undownload',
              detail: item.detail ? JSON.parse(JSON.stringify(item.detail)) : undefined,
            })),
          });
          console.log(`添加了 ${processedData.downloadUrlData.length} 个新的下载链接`);
        }
      }

      // 处理图片上传（如果需要）
      if (images && images.length > 0) {
        // 这里可以添加图片处理逻辑
        // 暂时跳过图片处理，保持现有图片
      }
    });

    // 获取更新后的文档
    const updatedDocument = await prisma.document.findUnique({
      where: { id: id },
      include: { downloadURLs: true },
    });
    
    if (downloadImmediately) {
      const taskId = uuidv4();
      setTimeout(() => {
        downloadImmediatelyTask(taskId, updatedDocument, movieData);
      }, 1000);
      
      return NextResponse.json(
        { message: "文档更新成功，下载任务已启动", taskId },
        { status: 202 }
      );
    }

    return NextResponse.json(
      { message: "文档更新成功", document: updatedDocument },
      { status: 200 }
    );
  } catch (error) {
    console.error("更新文档失败:", error);
    return NextResponse.json(
      { message: "更新文档失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证文档是否存在
    const { id } = await params;
    const existingDocument = await prisma.document.findUnique({
      where: { id: id },
    });

    if (!existingDocument) {
      return NextResponse.json(
        { message: "文档不存在" },
        { status: 404 }
      );
    }

    // 删除文档（级联删除相关数据）
    await prisma.document.delete({
      where: { id: id },
    });

    return NextResponse.json(
      { message: "文档删除成功" },
      { status: 200 }
    );
  } catch (error) {
    console.error("删除文档失败:", error);
    return NextResponse.json(
      { message: "删除文档失败" },
      { status: 500 }
    );
  }
}

