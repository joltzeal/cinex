
import { db } from "@/lib/db";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { LucideMousePointerClick, Star } from "lucide-react";
import { AddSubscribeDialog } from "./add-subscribe-dialog";
import { LazyImage } from "@/components/LazyImage";
import { ForumListImage } from "./forum-list-image";

interface ForumListProps {
  forumId?: string;
  threadId?: string;
  postId?: string;
  searchQuery?: string;
}

export async function ForumList({ forumId, threadId, postId, searchQuery }: ForumListProps) {
  // 特殊处理：显示搜索结果
  if (forumId === 'search' && searchQuery) {
    const searchResults = await db.forumPost.findMany({
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
      },
      include: {
        forumSubscribe: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (searchResults.length === 0) {
      return (
        <div className="h-full flex items-center justify-center p-4">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LucideMousePointerClick />
              </EmptyMedia>
              <EmptyTitle>未找到相关结果</EmptyTitle>
              <EmptyDescription>
                尝试使用其他关键词搜索
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      );
    }

    return (
      <div className="h-full w-full overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="flex flex-col gap-2 p-2">
            {searchResults.map((post) => (
              <Link
                key={post.id}
                href={`/dashboard/subscribe/forum?forumId=search&q=${encodeURIComponent(searchQuery)}&postId=${post.id}`}
                className={cn(
                  "flex flex-col gap-2 p-2 rounded-lg border hover:bg-accent transition-colors",
                  postId === post.id && "bg-accent border-primary"
                )}
              >
                {post.cover && (
                  <div className="relative aspect-video w-full overflow-hidden rounded-md">
                    <ForumListImage
                      src={post.cover}
                      alt={post.title}
                    />
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-medium line-clamp-2" title={post.title}>
                    {post.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5">
                      {post.forumSubscribe.title}
                    </span>
                    {post.author && (
                      <span className="truncate">{post.author}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // 特殊处理：显示所有收藏的帖子
  if (forumId === 'star') {
    const starredPosts = await db.forumPost.findMany({
      where: {
        isStar: true,
      },
      include: {
        forumSubscribe: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (starredPosts.length === 0) {
      return (
        <div className="h-full flex items-center justify-center p-4">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LucideMousePointerClick />
              </EmptyMedia>
              <EmptyTitle>暂无收藏</EmptyTitle>
              <EmptyDescription>
                点击帖子详情页的星标按钮收藏帖子
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      );
    }

    return (
      <div className="h-full w-full overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="flex flex-col gap-2 p-2">
            {starredPosts.map((post) => (
              <Link
                key={post.id}
                href={`/dashboard/subscribe/forum?forumId=star&postId=${post.id}`}
                className={cn(
                  "flex flex-col gap-2 p-2 rounded-lg border hover:bg-accent transition-colors",
                  postId === post.id && "bg-accent border-primary"
                )}
              >
                {post.cover && (
                  <div className="relative aspect-video w-full overflow-hidden rounded-md">
                    <ForumListImage
                      src={post.cover}
                      alt={post.title}
                    />
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <div className="flex items-start gap-2">
                    <Star className="h-4 w-4 flex-shrink-0 fill-yellow-400 text-yellow-400 mt-0.5" />
                    <h3 className="text-sm font-medium line-clamp-2 flex-1" title={post.title}>
                      {post.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5">
                      {post.forumSubscribe.title}
                    </span>
                    {post.author && (
                      <span className="truncate">{post.author}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (!forumId || !threadId) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        {/* <p className="text-sm text-muted-foreground text-center">
          Please select a subscription from the tabs above.
        </p> */}
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LucideMousePointerClick />
            </EmptyMedia>
            <EmptyTitle>先在上方选择论坛</EmptyTitle>
            <EmptyDescription>

            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex gap-2">
              <AddSubscribeDialog />
            </div>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const subscription = await db.forumSubscribe.findUnique({
    where: {
      thread_forum: {
        thread: threadId,
        forum: forumId,
      },
    },
  });

  if (!subscription) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LucideMousePointerClick />
            </EmptyMedia>
            <EmptyTitle>你还没有添加订阅</EmptyTitle>
            <EmptyDescription>
              点击下方添加订阅按钮添加订阅
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex gap-2">
              <AddSubscribeDialog />
            </div>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const posts = await db.forumPost.findMany({
    where: {
      forumSubscribeId: subscription.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (posts.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground text-center">
          No posts found. Try syncing to fetch posts.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <ScrollArea className="h-full w-full">
        <div className="flex flex-col gap-2 p-2">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/dashboard/subscribe/forum?forumId=${forumId}&threadId=${threadId}&postId=${post.id}`}
              className={cn(
                "flex flex-col gap-2 p-2 rounded-lg border hover:bg-accent transition-colors",
                postId === post.id && "bg-accent border-primary"
              )}
            >

              {post.cover && (
                <div className="relative aspect-video w-full overflow-hidden rounded-md">
                  <ForumListImage
                    src={post.cover}
                    alt={post.title}
                    
                  />
                </div>
              )}
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-medium line-clamp-2" title={post.title}>
                  {post.title}
                </h3>

              </div>
            </Link>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
