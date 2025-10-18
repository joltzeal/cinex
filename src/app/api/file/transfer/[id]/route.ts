import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.fileTransferLog.delete({ where: { id } });
  return NextResponse.json({ message: '删除成功' });
}