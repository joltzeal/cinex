// src/app/api/telegram/messages/route.ts - 获取 Telegram 消息列表
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const chatTitle = searchParams.get('chatTitle') || '';
    
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {};
    
    if (search) {
      where.OR = [
        { text: { contains: search, mode: 'insensitive' } },
        { chatTitle: { contains: search, mode: 'insensitive' } },
        { fileName: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (chatTitle) {
      where.chatTitle = { contains: chatTitle, mode: 'insensitive' };
    }

    // 获取消息列表和总数
    const [messages, total] = await Promise.all([
      prisma.telegramMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          messageId: true,
          chatId: true,
          chatTitle: true,
          text: true,
          tags: true,
          forwardUrl: true,
          mediaType: true,
          fileName: true,
          filePath: true,
          mediaCount: true,
          processed: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.telegramMessage.count({ where })
    ]);

    // 处理消息数据
    const processedMessages = messages.map((message: { fileName: string; createdAt: { toLocaleString: (arg0: string) => any; }; text: string; tags: any; }) => ({
      ...message,
      // 提取文件扩展名和类型
      fileType: message.fileName ? getFileType(message.fileName) : null,
      // 格式化时间
      createdAtFormatted: message.createdAt.toLocaleString('zh-CN'),
      // 截取长文本
      textPreview: message.text ? 
        (message.text.length > 100 ? message.text.substring(0, 100) + '...' : message.text) 
        : null,
      // 提取标签
      tagsArray: Array.isArray(message.tags) ? message.tags : []
    }));

    // 获取频道统计
    const channelStats = await prisma.telegramMessage.groupBy({
      by: ['chatTitle'],
      _count: true,
      orderBy: {
        _count: {
          chatTitle: 'desc'
        }
      },
      take: 10
    });

    return NextResponse.json({
      success: true,
      data: {
        messages: processedMessages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: skip + limit < total,
          hasPrev: page > 1
        },
        stats: {
          totalMessages: total,
          channels: channelStats.map((stat: { chatTitle: any; _count: any; }) => ({
            name: stat.chatTitle,
            count: typeof stat._count === 'number' ? stat._count : 0
          }))
        }
      }
    });

  } catch (error) {
    console.error('获取 Telegram 消息失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '获取消息失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

// 根据文件名判断文件类型
function getFileType(fileName: string): string {
  if (!fileName) return 'unknown';
  
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  if (!extension) return 'unknown';
  
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
  const videoTypes = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v'];
  const audioTypes = ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'wma'];
  const documentTypes = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'];
  const archiveTypes = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'];
  
  if (imageTypes.includes(extension)) return 'image';
  if (videoTypes.includes(extension)) return 'video';
  if (audioTypes.includes(extension)) return 'audio';
  if (documentTypes.includes(extension)) return 'document';
  if (archiveTypes.includes(extension)) return 'archive';
  
  return 'file';
}