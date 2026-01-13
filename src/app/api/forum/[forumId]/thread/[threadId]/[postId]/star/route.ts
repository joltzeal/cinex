import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ forumId: string; threadId: string; postId: string }> }) {
  try {
    const { forumId, threadId, postId } = await params;
    if (!forumId || !threadId || !postId) {
      return NextResponse.json({ error: 'Forum ID, thread ID and post ID are required' }, { status: 400 });
    }
    const post = await prisma.forumPost.findUnique({
      where: {
        id: postId,
      },
    });
    
    if (post) {
      await prisma.forumPost.update({
        where: {
          id: postId,
        },
        data: {
          isStar: !post.isStar,
        },
      });
      return NextResponse.json({ success: true, message: 'Post starred' }, { status: 200 });
    }
    else {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}