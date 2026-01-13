import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.fileTransferLog.delete({ where: { id } });
  return NextResponse.json({ message: '删除成功' });
}