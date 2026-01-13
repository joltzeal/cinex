
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { LinkIcon, ListVideo } from "lucide-react";
import { FetchPostContent } from "./fetch-post-content";
import Link from "next/link";
// import { PostDownload } from "./download";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { StarPost } from "./star-post";
import { PostContext } from "./post-context";
import { ForumPost } from "@prisma/client";
interface ForumContentProps {
  postId?: string;
  forumId?: string;
  threadId?: string;
}

export async function ForumContent({ postId, forumId, threadId }: ForumContentProps) {
  // 收藏视图（forumId=star）和搜索视图（forumId=search）不需要 threadId
  const isStarView = forumId === 'star';
  const isSearchView = forumId === 'search';

  if (!postId || !forumId || (!threadId && !isStarView && !isSearchView)) {
    return (
      <div className="h-full flex items-center justify-center">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListVideo />
            </EmptyMedia>
            <EmptyTitle>先在左侧选择帖子</EmptyTitle>
            <EmptyDescription>

            </EmptyDescription>
          </EmptyHeader>

        </Empty>
      </div>
    );
  }
  

  const post = await prisma.forumPost.findUnique({
    where: {
      id: postId,
    },
    include: {
      forumSubscribe: true,
    },
  });

  if (!post?.readed) {
    await prisma.forumPost.update({
      where: {
        id: postId,
      },
      data: { readed: true },
    });
  }

  if (!post) {
    return (
      <div className="h-full flex items-center justify-center">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
            </EmptyMedia>
            <EmptyTitle>帖子不存在</EmptyTitle>
            <EmptyDescription>
              请先在左侧选择帖子
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  // 在收藏视图和搜索视图中，使用帖子本身的 forum 信息而不是 URL 参数
  const actualForumId = (isStarView || isSearchView) ? post.forumSubscribe.forum : forumId;
  const actualThreadId = (isStarView || isSearchView) ? post.forumSubscribe.thread : threadId;

  function getForumUrl(forumId: string | undefined, postId: string, url: string): string | undefined {
    if (forumId === '2048') {
      return `https://hjd2048.com/2048/read.php?tid=${postId}`;
    } else if (forumId === 'sehuatang') {
      return `https://www.sehuatang.net/thread-${postId}-1-1.html`;
    } else if (forumId === 'javbus') {
      return `https://www.javbus.com/forum/forum.php?mod=viewthread&tid=${postId}`;
    } else if (forumId === 't66y') {
      return url;
    } else if (forumId === 'southPlus') {
      return `https://www.south-plus.net/read.php?tid=${postId}.html`;
    }
    return '#';
  }

  return (
    <div className="h-full w-full overflow-hidden">
      {actualForumId && actualThreadId && post.postId && !post.content && (
        <FetchPostContent
          postId={post.id}
          forumId={actualForumId}
          threadId={actualThreadId}
          postDbId={post.id}
          hasContent={!!post.content}
        />
      )}
      <ScrollArea className="h-full w-full">
        <div className="p-6">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between ">
                <div className="space-y-2 flex-1">
                  <CardTitle className="text-2xl">{post.title}</CardTitle>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {post.author && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">作者:</span>
                        <span>{post.author}</span>
                      </div>
                    )}
                    {post.publishedAt && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">发布:</span>
                        <span>{new Date(post.publishedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                {post.url && (
                  <Button asChild size="sm">
                    <Link
                      href={getForumUrl(actualForumId, post.postId, post.url)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      <LinkIcon className="w-4 h-4" />
                    </Link>
                  </Button>

                )}
                {/* {
                  post.content && (
                    <PostDownload content={post.content} title={post.title} >
                    </PostDownload>
                  )
                } */}
                {/*  */}
                {actualForumId && actualThreadId && (
                  <StarPost key={post.id} forumId={actualForumId} threadId={actualThreadId} postId={post.id} star={post.isStar} />
                )}
              </div>
            </CardHeader>
            <CardContent className="w-full">

              {post.content ? (
                <PostContext post={post as ForumPost} forum={forumId}/>

              ) : (
                <div className="w-full">
                  <Empty className="w-full">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Spinner />
                      </EmptyMedia>
                      <EmptyTitle>获取帖子内容中...</EmptyTitle>
                      <EmptyDescription>
                        请稍后...
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                  <Empty title="Loading Content">
                    <EmptyDescription>

                    </EmptyDescription>
                  </Empty>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
