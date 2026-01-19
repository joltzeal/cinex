import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';
import { getSetting, getTelegramDownloadDirectoryConfig, SettingKey } from '@/services/settings';
import { logger } from '@/lib/logger';

interface DeleteMessageRequest {
  deleteLocalFiles: boolean;
}

export async function DELETE(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const messageId = parseInt(id);

    logger.info(`删除消息: ${messageId}`);
    
    if (isNaN(messageId)) {
      return NextResponse.json(
        { success: false, message: '无效的消息ID' },
        { status: 400 }
      );
    }

    // 解析请求体
    let deleteLocalFiles = false;
    try {
      const body: DeleteMessageRequest = await request.json();
      deleteLocalFiles = body.deleteLocalFiles || false;
    } catch (error) {
      // 如果解析失败，使用默认值
      console.log('解析请求体失败，使用默认值');
    }

    // 首先获取消息信息，包括文件路径
    const message = await prisma.telegramMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        filePath: true,
        chatTitle: true,
        text: true,
        mediaCount: true
      }
    });

    if (!message) {
      return NextResponse.json(
        { success: false, message: '消息不存在' },
        { status: 404 }
      );
    }

    // 如果需要删除本地文件
    const deletedFiles: string[] = [];
    const failedFiles: string[] = [];

    if (deleteLocalFiles && message.filePath && message.filePath.length > 0) {
      console.log(`准备删除 ${message.filePath.length} 个本地文件`);
      const telegramPath = await getTelegramDownloadDirectoryConfig();
      let parentpath = '';
      for (const filePath of message.filePath) {
        try {
          const filepath = path.join('media', filePath);
          
          
          // 检查文件是否存在
          try {
            await fs.access(filepath);
            
            // 删除文件
            await fs.unlink(filepath);
            deletedFiles.push(filePath);
            console.log(`成功删除文件: ${filepath}`);
            parentpath = path.dirname(filepath);
          } catch (accessError) {
            console.log(`文件不存在或无法访问: ${filepath}`);
            // 文件不存在，不算错误，继续处理
            deletedFiles.push(filePath);
          }
          
        } catch (deleteError) {
          console.error(`删除文件失败: ${filePath}`, deleteError);
          failedFiles.push(filePath);
        }
      }
      if (parentpath) {
        // 递归删除目录及其内容，相当于 rm -rf
        await fs.rm(parentpath, { recursive: true, force: true });
      }
    }
    

    // 从数据库删除消息记录
    await prisma.telegramMessage.delete({
      where: { id: messageId },
    });

    // 构建响应消息
    let responseMessage = '消息已成功删除';
    
    if (deleteLocalFiles) {
      if (deletedFiles.length > 0 && failedFiles.length === 0) {
        responseMessage = `消息和 ${deletedFiles.length} 个本地文件已成功删除`;
      } else if (deletedFiles.length > 0 && failedFiles.length > 0) {
        responseMessage = `消息已删除，${deletedFiles.length} 个文件删除成功，${failedFiles.length} 个文件删除失败`;
      } else if (failedFiles.length > 0) {
        responseMessage = `消息已删除，但 ${failedFiles.length} 个本地文件删除失败`;
      } else {
        responseMessage = '消息已删除，没有找到需要删除的本地文件';
      }
    }

    console.log(`删除消息完成: ID=${messageId}, 删除本地文件=${deleteLocalFiles}, 成功删除文件=${deletedFiles.length}, 失败文件=${failedFiles.length}`);

    return NextResponse.json({
      success: true,
      message: responseMessage,
      data: {
        messageId,
        deletedFiles: deletedFiles.length,
        failedFiles: failedFiles.length,
        deleteLocalFiles,
        details: {
          deletedFiles,
          failedFiles
        }
      }
    });

  } catch (error) {
    console.error('删除消息失败:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: '删除消息失败: ' + (error instanceof Error ? error.message : '未知错误'),
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}