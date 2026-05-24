import OpenAI from 'openai';
import { z } from 'zod';
import { Movie, Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { createOpenAIProxyFetch } from '@/lib/openai-proxy-fetch';
import { prisma } from '@/lib/prisma';
import { getProxyUrl, getSetting, SettingKey } from '@/services/settings';
import { MovieDetail } from '@/types/javbus';

export const runtime = 'nodejs';

const aiReviewSchema = z.object({
  chineseTitle: z.string().default(''),
  genre: z.string().default(''),
  plot: z.string().default(''),
  positiveReview: z.string().default(''),
  neutralNegativeReview: z.string().default(''),
  audienceComments: z.array(z.string()).default([]),
  similarMovies: z
    .array(
      z.union([
        z.string(),
        z.object({
          number: z.string().optional().default(''),
          title: z.string().optional().default('')
        })
      ])
    )
    .default([])
    .transform((movies) =>
      movies.map((movie) => {
        if (typeof movie === 'string') {
          const number = movie.match(/[A-Z]{2,10}-?\d{2,6}/i)?.[0] ?? movie;
          return {
            number: number.toUpperCase(),
            title: movie
          };
        }

        const number = movie.number || movie.title;
        return {
          number: number.toUpperCase(),
          title: movie.title || movie.number
        };
      })
    )
});

function extractJsonObject(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced?.[1] ?? content;
  const start = jsonText.indexOf('{');
  const end = jsonText.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI response did not contain a JSON object');
  }

  return JSON.parse(jsonText.slice(start, end + 1));
}

function buildMovieContext(movie: Movie) {
  const detail = (movie.detail || {}) as unknown as MovieDetail;

  return {
    number: movie.number,
    title: movie.title,
    date: movie.date,
    existingRating: movie.rating,
    existingComment: movie.comment,
    existingTags: movie.tags,
    detailTitle: detail.title,
    director: detail.director?.name,
    producer: detail.producer?.name,
    publisher: detail.publisher?.name,
    series: detail.series?.name,
    videoLength: detail.videoLength,
    genres: detail.genres?.map((genre) => genre.name),
    stars: detail.stars?.map((star) => star.name),
    similarMovies: detail.similarMovies?.map((similar) => ({
      id: similar.id,
      title: similar.title
    }))
  };
}

function streamEvent(type: string, payload: Record<string, unknown> = {}) {
  return `${JSON.stringify({ type, ...payload })}\n`;
}

function getAiReviewErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return 'AI 返回的数据结构不正确';
  }

  if (error instanceof OpenAI.APIError) {
    return error.message || 'AI Provider 请求失败';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'AI 影评生成失败';
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id.toUpperCase();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Movie ID is required' },
        { status: 400 }
      );
    }

    const aiConfig = await getSetting(SettingKey.AiProviderConfig);
    if (!aiConfig?.apiKey || !aiConfig?.baseURL || !aiConfig?.modelName) {
      return NextResponse.json(
        { success: false, error: '请先在设置中配置 AI Provider' },
        { status: 400 }
      );
    }

    const movie = await prisma.movie.findUnique({
      where: { number: id }
    });

    if (!movie) {
      return NextResponse.json(
        { success: false, error: 'Movie not found' },
        { status: 404 }
      );
    }

    const proxyConfig = await getProxyUrl();
    const fetch = createOpenAIProxyFetch(proxyConfig?.proxyUrl);

    const client = new OpenAI({
      apiKey: aiConfig.apiKey,
      baseURL: aiConfig.baseURL,
      fetch
    });

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `你是一个专业但克制的中文电影评论员。请基于用户提供的影片元数据写一份中文影评，避免露骨描写，不编造无法从元数据合理推断的事实。

你必须只返回一个 JSON object，不要返回 Markdown、解释或额外文本。JSON 字段必须完全如下：
{
  "chineseTitle": "中文标题",
  "genre": "类型",
  "plot": "剧情",
  "positiveReview": "正面评价",
  "neutralNegativeReview": "中性/负面评价",
  "audienceComments": ["网友评论1", "网友评论2", "网友评论3"],
  "similarMovies": [
    { "number": "影片番号1", "title": "影片名称1" },
    { "number": "影片番号2", "title": "影片名称2" },
    { "number": "影片番号3", "title": "影片名称3" }
  ]
}

要求：
1. chineseTitle 使用自然中文片名；如果无法翻译，保留原名并做中文化整理。
2. genre 归纳为简短中文类型，不超过 20 个字。
3. plot 控制在 80-160 个中文字符。
4. positiveReview 和 neutralNegativeReview 各控制在 80-180 个中文字符。
5. audienceComments 给出 3 条短评，语气像普通网友，但保持礼貌克制。
6. similarMovies 必须优先使用输入 similarMovies 里的 id 作为 number、title 作为 title；如果无法确定番号，number 可以使用标题，但不要留空。`
      },
      {
        role: 'user',
        content: JSON.stringify(buildMovieContext(movie), null, 2)
      }
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let rawContent = '';

        try {
          

          const completion = await client.chat.completions.create({
            model: aiConfig.modelName,
            messages,
            response_format: { type: 'json_object' },
            stream: true
          });

          
          for await (const part of completion) {
            const delta = part.choices[0]?.delta?.content ?? '';

            if (!delta) {
              continue;
            }

            rawContent += delta;
            controller.enqueue(encoder.encode(streamEvent('delta', { delta })));
          }

          if (!rawContent) {
            throw new Error('AI 返回了空内容');
          }

          const parsed = aiReviewSchema.parse(extractJsonObject(rawContent));
          await prisma.movie.update({
            where: { number: id },
            data: {
              aiReview: parsed as unknown as Prisma.InputJsonValue
            } as any
          });
          controller.enqueue(encoder.encode(streamEvent('done', { data: parsed })));
        } catch (error) {
          logger.error(`AI 影评流式生成失败:${error}`);
          controller.enqueue(
            encoder.encode(
              streamEvent('error', {
                error: getAiReviewErrorMessage(error)
              })
            )
          );
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive'
      }
    });
  } catch (error) {
    logger.error(`AI 影评生成失败:${error}`);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'AI 返回的数据结构不正确' },
        { status: 502 }
      );
    }

    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { success: false, error: error.message || 'AI Provider 请求失败' },
        { status: error.status || 502 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'AI 影评生成失败' },
      { status: 500 }
    );
  }
}
