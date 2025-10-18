'use client';

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { deleteForumThread } from "@/services/forum";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

interface DeleteThreadButtonProps {
  forumId: string;
  threadId: string;
}

export function DeleteThreadButton({ forumId, threadId }: DeleteThreadButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault(); // 阻止 Link 的导航
    e.stopPropagation(); // 阻止事件冒泡
    
    if (confirm('确定要删除这个订阅吗？')) {
      startTransition(async () => {
        await deleteForumThread(forumId, threadId);
        // Server Action 会自动刷新数据，这里可以选择性地导航
        router.push('/dashboard/subscribe/forum');
      });
    }
  };

  return (
    <Button 
      variant="outline" 
      size="icon" 
      onClick={handleDelete}
      disabled={isPending}
    >
      <X className="h-4 w-4" />
    </Button>
  );
}

