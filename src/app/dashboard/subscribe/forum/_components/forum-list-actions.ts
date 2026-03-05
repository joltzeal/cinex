'use server';

import { prisma } from "@/lib/prisma";
import { getForumPostReadFilterWhere, type ReadFilter } from "./read-filter";

const PAGE_SIZE = 50;

export interface ForumPost {
  id: string;
  title: string;
  cover: string | null;
  author: string | null;
  readed: boolean;
  createdAt: Date;
  forumSubscribe?: {
    title: string;
  };
  isStar?: boolean;
}

export async function loadSearchPosts(searchQuery: string, offset: number = 0, readFilter: ReadFilter = 'all') {
  const posts = await prisma.forumPost.findMany({
    where: {
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
      ...getForumPostReadFilterWhere(readFilter),
    },
    include: {
      forumSubscribe: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    skip: offset,
    take: PAGE_SIZE,
  });

  return {
    posts,
    hasMore: posts.length === PAGE_SIZE,
  };
}

export async function loadStarredPosts(offset: number = 0, readFilter: ReadFilter = 'all') {
  const posts = await prisma.forumPost.findMany({
    where: {
      isStar: true,
      ...getForumPostReadFilterWhere(readFilter),
    },
    include: {
      forumSubscribe: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    skip: offset,
    take: PAGE_SIZE,
  });

  return {
    posts,
    hasMore: posts.length === PAGE_SIZE,
  };
}

export async function loadSubscriptionPosts(subscriptionId: string, offset: number = 0, readFilter: ReadFilter = 'all') {
  const posts = await prisma.forumPost.findMany({
    where: {
      forumSubscribeId: subscriptionId,
      ...getForumPostReadFilterWhere(readFilter),
    },
    orderBy: {
      createdAt: "desc",
    },
    skip: offset,
    take: PAGE_SIZE,
  });

  return {
    posts,
    hasMore: posts.length === PAGE_SIZE,
  };
}

export async function getSubscription(forumId: string, threadId: string) {
  return await prisma.forumSubscribe.findUnique({
    where: {
      thread_forum: {
        thread: threadId,
        forum: forumId,
      },
    },
  });
}
