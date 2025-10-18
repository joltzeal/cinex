"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface FetchPostContentProps {
  postId: string;
  forumId: string;
  threadId: string;
  postDbId: string;
  hasContent: boolean;
}

export function FetchPostContent({ postId, forumId, threadId, postDbId, hasContent }: FetchPostContentProps) {
  const router = useRouter();

  useEffect(() => {
    // 如果已经有内容，不需要获取
    if (hasContent) return;

    let isMounted = true;

    const fetchContent = async () => {
      try {
        // toast.loading("获取帖子内容...");
        
        const response = await fetch(`/api/forum/${forumId}/thread/${threadId}/${postId}`);
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to fetch post content");
        }

        
        
        if (isMounted) {
          router.refresh();
        }
      } catch (error) {
        if (isMounted) {
          const errorMessage = error instanceof Error ? error.message : "Failed to fetch content";
          toast.error(errorMessage,);
        }
      } finally {
      }
    };

    fetchContent();

    return () => {
      isMounted = false;
    };
  }, [postId, forumId, threadId, postDbId, hasContent, router]);

  return null;
}

