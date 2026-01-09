import { prisma } from '@/lib/prisma';
import { DocumentDownloadStatus } from '@prisma/client';

export async function getDocumentDownloadCount(
  status: DocumentDownloadStatus
): Promise<number> {
  return await prisma.documentDownloadURL.count({
    where: {
      status: status
    }
  });
}
export async function getDocumentDownloadById(id: string) {
  return await prisma.document.findUnique({
    where: { id: id },
    include: { downloadURLs: true }
  });
}
