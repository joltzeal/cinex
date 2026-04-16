import { logger } from '@/lib/logger';
import { getFileInfo } from '@/lib/parse/get-file-info';
import { prisma } from '@/lib/prisma';
import { manualTransfer } from '@/lib/transfer';
import { TransferStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const transferLog = await prisma.fileTransferLog.findUnique({
      where: { id },
    });

    if (!transferLog) {
      return NextResponse.json({ success: false, error: '转移记录不存在' }, { status: 404 });
    }

    if (transferLog.status !== TransferStatus.FAILURE) {
      return NextResponse.json({ success: false, error: '只有失败记录才允许重试' }, { status: 409 });
    }

    const fileInfo = await getFileInfo(transferLog.sourcePath);
    if (!fileInfo.number) {
      return NextResponse.json({ success: false, error: '无法从源文件重新解析番号' }, { status: 400 });
    }

    await prisma.fileTransferLog.update({
      where: { id },
      data: {
        title: fileInfo.fileName,
        number: fileInfo.number,
        destinationPath: '',
        status: TransferStatus.PROCESSING,
        errorMessage: null,
        initiatedAt: new Date(),
        completedAt: null,
      },
    });

    void manualTransfer({
      file: { id: transferLog.sourcePath, name: fileInfo.fileName },
      number: fileInfo.number,
      transferMethod: transferLog.transferMethod,
      fileTransferLogId: transferLog.id,
    }).catch((error) => {
      logger.error(`重试文件转移失败:${error}`);
    });

    return NextResponse.json({ success: true, message: '已开始重试' });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
