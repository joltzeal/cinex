import {prisma} from "@/lib/prisma";
// 1. 从 @prisma/client 导入基础模型类型
import type { Document, DocumentDownloadURL, DocumentDownloadStatus } from "@prisma/client";

// 2. 显式地定义我们的复合类型
// 这个类型表示一个 Document 对象，并且它一定包含一个 DocumentDownloadURL 数组
export type DocumentWithURLs = Document & {
  downloadURLs: DocumentDownloadURL[];
};

// 定义搜索参数的类型 (保持不变)
export interface GetDocumentsParams {
  query?: string;
  status?: DocumentDownloadStatus;
  type?: string;
  page?: number;
  pageSize?: number;
}

export async function getDocuments({
  query = '',
  status,
  type,
  page = 1,
  pageSize = 10,
}: GetDocumentsParams): Promise<{ documents: DocumentWithURLs[], pageCount: number, totalCount: number }> { // 明确返回类型
  try {
    const skip = (page - 1) * pageSize;

    const where = {
      ...(query && {
        OR: [
          { title: { contains: query,  } },
          { description: { contains: query, } },
        ],
      }),
      ...(status && {
        downloadURLs: {
          some: {
            status: status,
          },
        },
      }),
      ...(type && {
        downloadURLs: {
          some: {
            type: type,
          },
        },
      }),
    };

    const [documents, totalCount] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          downloadURLs: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: skip,
        take: pageSize,
      }),
      prisma.document.count({ where }),
    ]);

    const pageCount = Math.ceil(totalCount / pageSize);

    // TypeScript 现在知道 documents 是 DocumentWithURLs[] 类型
    return { documents, pageCount, totalCount }; 
  } catch (error) {
    console.error("Failed to fetch documents:", error);
    return { documents: [], pageCount: 0, totalCount: 0 };
  }
}