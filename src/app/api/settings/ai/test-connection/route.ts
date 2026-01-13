import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

// 定义请求体的 Zod Schema
const testSchema = z.object({
  baseURL: z.string().url(),
  apiKey: z.string(),
  modelName: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = testSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ success: false, message: '请求参数无效。' }, { status: 400 });
    }

    const { baseURL, apiKey, modelName } = parseResult.data;

    // 使用传入的配置初始化客户端
    const tempClient = new OpenAI({
      apiKey,
      baseURL,
    });

    // 发送一个非常简短、低成本的请求来测试连接和认证
    await tempClient.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5,
    });

    // 如果上面的请求没有抛出异常，说明连接成功
    return NextResponse.json({ success: true, message: '连接成功！' });

  } catch (error: any) {
    console.error("AI connection test failed:", error);

    // 针对 OpenAI SDK 的常见错误类型提供更具体的反馈
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return NextResponse.json({ success: false, message: '认证失败：API Key 无效或已过期。' }, { status: 401 });
      }
      // if (error.status === 404) {
      //   return NextResponse.json({ success: false, message: `模型 '${error.request.body?.model}' 未找到，请检查模型名称。` }, { status: 404 }); // @ts-ignore
      // }
      return NextResponse.json({ success: false, message: `API 错误: ${error.message}` }, { status: error.status });
    }
    
    // 其他通用错误
    return NextResponse.json({ success: false, message: '连接失败，请检查 Base URL 和网络连接。' }, { status: 500 });
  }
}