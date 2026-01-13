import { NextResponse, NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { fetch2048PostDetail, fetchSehuatangPostDetail, fetchJavbusPostDetail, fetchT66yPostDetail, fetchSouthPlusPostDetail } from "@/lib/tasks/forum";
import { FORUMS } from "@/constants/data";


export async function GET(
  req: NextRequest,
  {
    params,
  }: { params: Promise<{ forumId: string; threadId: string; postId: string }> }
) {
  // postId 为 数据库中主键 ID
  try {
    const { forumId, threadId, postId } = await params;

    if (!postId || !forumId || !threadId) {
      return NextResponse.json({ error: 'Post ID, Forum ID and Thread ID are required' }, { status: 400 });
    }

    if (!FORUMS.includes(forumId)) {
      return NextResponse.json({ error: 'Invalid forum ID' }, { status: 400 });
    }
    // 获取订阅
    const forumSubscribe = await prisma.forumSubscribe.findFirst({
      where: {
        forum: forumId,
        thread: threadId,
      }
    })

    if (!forumSubscribe) {

      return NextResponse.json({ error: 'Forum subscription not found' }, { status: 404 });
    }
    // 获取帖子
    const post = await prisma.forumPost.findUnique({
      where: {
        id: postId,
      },
    });
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    // 如果帖子有内容，则直接返回
    if (post?.content) {
      
      return NextResponse.json({ data: post }, { status: 200 });
    }

    // 获取帖子详情 逻辑
    let updatedPost: any = null;
    if (forumId === '2048') {
      updatedPost = await fetch2048PostDetail(post.postId);
    } else if (forumId === 'sehuatang') {
      updatedPost = await fetchSehuatangPostDetail(post.postId);
    }
    else if (forumId === 'javbus') {
      updatedPost = await fetchJavbusPostDetail(post.postId);
    } else if (forumId === 't66y') {
      if (!post.url) {
        return NextResponse.json({ error: 'Post URL is required' }, { status: 400 });
      }
      updatedPost = await fetchT66yPostDetail(post.postId, post.url as string);
    } else if (forumId === 'southPlus') {
      updatedPost = await fetchSouthPlusPostDetail(post.postId);
    } else {
      return NextResponse.json({ error: 'Invalid forum ID' }, { status: 400 });
    }
    // 更新帖子
    const result = await prisma.forumPost.update({
      where: {
        forumSubscribeId_postId: {
          forumSubscribeId: forumSubscribe.id,
          postId: post.postId,
        },
      },
      data: {
        ...updatedPost,
        readed: true,
      },
    })
    return NextResponse.json({
      success: true,
      message: '帖子详情已更新',
      data: result,
    });



  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`发生错误，获取帖子详情: ${errorMessage}`);
    return NextResponse.json({
      error: '内部服务器错误',
      message: errorMessage
    }, { status: 500 });
  }
}
