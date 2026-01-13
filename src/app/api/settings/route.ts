import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SettingKey, upsertSetting } from '@/services/settings';

// 定义我们期望接收的数据结构
const settingSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, value } = settingSchema.parse(body);
    const setting = await upsertSetting(key as SettingKey, value);

    return NextResponse.json({ success: true, data: setting });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

