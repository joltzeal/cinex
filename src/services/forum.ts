'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function deleteForumPost(id: string) {
  return await prisma.forumPost.delete({
    where: { id: id }
  });
}

export async function deleteForumThread(forumId: string, threadId: string) {
  await prisma.forumSubscribe.deleteMany({
    where: { forum: forumId, thread: threadId }
  });

  // 重新验证页面，刷新数据
  revalidatePath('/dashboard/subscribe/forum');
}
