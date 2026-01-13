'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { LucideMousePointerClick, Star, Loader2 } from "lucide-react";
import { AddSubscribeDialog } from "./add-subscribe-dialog";
import { ForumListImage } from "./forum-list-image";
import { loadSearchPosts, loadStarredPosts, loadSubscriptionPosts, getSubscription, type ForumPost } from "./forum-list-actions";

interface ForumListProps {
  forumId?: string;
  threadId?: string;
  postId?: string;
  searchQuery?: string;
  initialPosts: ForumPost[];
  initialHasMore: boolean;
  subscriptionId?: string;
}

export function ForumList({ forumId, threadId, postId, searchQuery, initialPosts, initialHasMore, subscriptionId }: ForumListProps) {
  const [posts, setPosts] = useState<ForumPost[]>(initialPosts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const lastPostIdRef = useRef<string | undefined>(postId);

  // Reset posts when props change
  useEffect(() => {
    setPosts(initialPosts);
    setHasMore(initialHasMore);
  }, [forumId, threadId, searchQuery, initialPosts, initialHasMore]);

  // Scroll to selected post when postId changes
  useEffect(() => {
    if (postId && postId !== lastPostIdRef.current) {
      lastPostIdRef.current = postId;
      
      // Wait for DOM to update
      setTimeout(() => {
        const element = document.querySelector(`[data-post-id="${postId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [postId]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const offset = posts.length;
      let result;

      if (forumId === 'search' && searchQuery) {
        result = await loadSearchPosts(searchQuery, offset);
      } else if (forumId === 'star') {
        result = await loadStarredPosts(offset);
      } else if (subscriptionId) {
        result = await loadSubscriptionPosts(subscriptionId, offset);
      }

      if (result) {
        setPosts(prev => [...prev, ...result.posts]);
        setHasMore(result.hasMore);
      }
    } catch (error) {
      console.error('Failed to load more posts:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [loading, hasMore, posts.length, forumId, searchQuery, subscriptionId]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const scrollPercentage = (target.scrollTop + target.clientHeight) / target.scrollHeight;
    
    // Load more when scrolled to 90%
    if (scrollPercentage > 0.9 && hasMore && !loading) {
      loadMore();
    }
  }, [hasMore, loading, loadMore]);

  // 特殊处理：显示搜索结果
  if (forumId === 'search' && searchQuery) {
    if (posts.length === 0 && !loading) {
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
        <ScrollArea className="h-full w-full" onScrollCapture={handleScroll}>
          <div className="flex flex-col gap-2 p-2">
            {posts.map((post) => (
              <Link
                key={post.id}
                data-post-id={post.id}
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
                      {post.forumSubscribe?.title}
                    </span>
                    {post.author && (
                      <span className="truncate">{post.author}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
            {loading && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // 特殊处理：显示所有收藏的帖子
  if (forumId === 'star') {
    if (posts.length === 0 && !loading) {
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
        <ScrollArea className="h-full w-full" onScrollCapture={handleScroll}>
          <div className="flex flex-col gap-2 p-2">
            {posts.map((post) => (
              <Link
                key={post.id}
                data-post-id={post.id}
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
                      {post.forumSubscribe?.title}
                    </span>
                    {post.author && (
                      <span className="truncate">{post.author}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
            {loading && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (!forumId || !threadId) {
    return (
      <div className="h-full flex items-center justify-center p-4">
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

  if (!subscriptionId) {
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

  if (posts.length === 0 && !loading) {
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
      <ScrollArea className="h-full w-full" onScrollCapture={handleScroll}>
        <div className="flex flex-col gap-2 p-2">
          {posts.map((post) => (
            <Link
              key={post.id}
              data-post-id={post.id}
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
                <h3 className={cn("text-sm font-medium line-clamp-2", post.readed && "text-muted-foreground line-through")} title={post.title}>
                  {post.title}
                </h3>
              </div>
            </Link>
          ))}
          {loading && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
