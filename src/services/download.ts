import { db } from "@/lib/db";
import { DocumentDownloadStatus } from "@prisma/client";

export async function getDocumentDownloadCount(status: DocumentDownloadStatus): Promise<number> {
  return await db.documentDownloadURL.count({
    where: {
      status: status
    },
  });
}
export async function getDocumentDownloadById(id: string) {
  return await db.document.findUnique({
    where: { id: id },
    include: { downloadURLs: true },
  });
}