
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ForumListWrapper } from "./_components/forum-list-wrapper";
import { ForumContent } from "./_components/forum-content";
import { SubscribeTabs } from "./_components/subscribe-tabs";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeReadFilter } from "./_components/read-filter";
export const metadata = {
  title: 'Forum'
};
export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const threadId = params.threadId as string | undefined;
  const forumId = params.forumId as string | undefined;
  const postId = params.postId as string | undefined;
  const searchQuery = params.q as string | undefined;
  const readParam = params.read;
  const readFilter = normalizeReadFilter(Array.isArray(readParam) ? readParam[0] : readParam);

  

  return (
    <div className="h-[calc(100dvh-62px)] w-full flex flex-col">
      <Suspense fallback={<div className="border-b p-4"><Skeleton className="h-9 w-full" /></div>}>
        <SubscribeTabs currentForumId={forumId} currentThreadId={threadId} searchQuery={searchQuery} readFilter={readFilter} />
      </Suspense>
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
          <ResizablePanel  minSize="20%" maxSize="40%" defaultSize="25%">
            <Suspense fallback={<div className="p-4"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full mt-2" /></div>}>
              <ForumListWrapper forumId={forumId} threadId={threadId} postId={postId} searchQuery={searchQuery} readFilter={readFilter} />
            </Suspense>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize="75%">
            <Suspense fallback={<div className="p-4"><Skeleton className="h-24 w-full" /></div>}>
              <ForumContent postId={postId} forumId={forumId} threadId={threadId} />
            </Suspense>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
