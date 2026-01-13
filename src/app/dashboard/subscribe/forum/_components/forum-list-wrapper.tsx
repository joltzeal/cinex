import { prisma } from "@/lib/prisma";
import { ForumList } from "./forum-list";

interface ForumListWrapperProps {
  forumId?: string;
  threadId?: string;
  postId?: string;
  searchQuery?: string;
}

const PAGE_SIZE = 50;

/**
 * 计算需要加载多少条数据才能包含目标帖子
 */
async function calculateRequiredItems(postId: string, where: any, orderBy: any): Promise<number> {
  // 获取所有帖子的ID列表（只查ID和排序字段，性能较好）
  const allPostIds = await prisma.forumPost.findMany({
    where,
    select: { id: true },
    orderBy,
  });

  // 找到目标帖子的索引位置
  const targetIndex = allPostIds.findIndex((p:any) => p.id === postId);
  
  if (targetIndex === -1) {
    // 如果没找到，返回默认页大小
    return PAGE_SIZE;
  }

  // 返回需要加载的数量（索引+1，并向上取整到PAGE_SIZE的倍数）
  const requiredItems = targetIndex + 1;
  return Math.ceil(requiredItems / PAGE_SIZE) * PAGE_SIZE;
}

export async function ForumListWrapper({ forumId, threadId, postId, searchQuery }: ForumListWrapperProps) {
  let initialPosts:any[] = [];
  let initialHasMore:boolean = false;
  let subscriptionId: string | undefined;

  // 处理搜索结果
  if (forumId === 'search' && searchQuery) {
    const where = {
      OR: [
        {
          title: {
            contains: searchQuery,
          },
        },
        {
          content: {
            contains: searchQuery,
          },
        },
      ],
    };
    const orderBy = { createdAt: "desc" as const };

    // 如果有选中的帖子，计算需要加载的数量
    let takeCount = PAGE_SIZE;
    if (postId) {
      takeCount = await calculateRequiredItems(postId, where, orderBy);
    }

    const posts = await prisma.forumPost.findMany({
      where,
      include: {
        forumSubscribe: true,
      },
      orderBy,
      take: takeCount,
    });

    initialPosts = posts;
    initialHasMore = posts.length === takeCount;
  }
  // 处理收藏列表
  else if (forumId === 'star') {
    const where = { isStar: true };
    const orderBy = { createdAt: "desc" as const };

    // 如果有选中的帖子，计算需要加载的数量
    let takeCount = PAGE_SIZE;
    if (postId) {
      takeCount = await calculateRequiredItems(postId, where, orderBy);
    }

    const posts = await prisma.forumPost.findMany({
      where,
      include: {
        forumSubscribe: true,
      },
      orderBy,
      take: takeCount,
    });

    initialPosts = posts;
    initialHasMore = posts.length === takeCount;
  }
  // 处理普通订阅列表
  else if (forumId && threadId) {
    const subscription = await prisma.forumSubscribe.findUnique({
      where: {
        thread_forum: {
          thread: threadId,
          forum: forumId,
        },
      },
    });

    if (subscription) {
      subscriptionId = subscription.id;
      
      const where = { forumSubscribeId: subscription.id };
      const orderBy = { createdAt: "desc" as const };

      // 如果有选中的帖子，计算需要加载的数量
      let takeCount = PAGE_SIZE;
      if (postId) {
        takeCount = await calculateRequiredItems(postId, where, orderBy);
      }

      const posts = await prisma.forumPost.findMany({
        where,
        orderBy,
        take: takeCount,
      });

      initialPosts = posts;
      initialHasMore = posts.length === takeCount;
    }
  }

  return (
    <ForumList
      forumId={forumId}
      threadId={threadId}
      postId={postId}
      searchQuery={searchQuery}
      initialPosts={initialPosts}
      initialHasMore={initialHasMore}
      subscriptionId={subscriptionId}
    />
  );
}

