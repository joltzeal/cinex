import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const userCount = await db.user.count();
    return NextResponse.json({ userCount });
  } catch (error) {
    console.error('检查用户数量失败:', error);
    return NextResponse.json(
      { error: '检查用户数量失败' },
      { status: 500 }
    );
  }
}
