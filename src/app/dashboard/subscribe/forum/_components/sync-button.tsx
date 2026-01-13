


import { Button } from "@/components/ui/button";
// import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { revalidatePath } from "next/cache";
import { toast } from "sonner";
interface SyncButtonProps {
  forumId: string;
  threadId: string;
}

async function syncThread(forumId: string, threadId: string) {
    const res = await fetch(`/api/forum/${forumId}/thread/${threadId}`, {
        method: 'GET',
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to sync thread');
    }

    return res.json();
}


export function SyncButton({ forumId, threadId }: SyncButtonProps) {
  // const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSync = async () => {
    startTransition(async () => {
      try {
        const result = await syncThread(forumId, threadId);
        toast.success("Thread synced successfully.");
        router.refresh(); // Re-fetches data in the current route's server components
      } catch (error: any) {
        toast.error(error.message || "An unknown error occurred.");
      }
    });
  };

  return (
    <Button onClick={handleSync} disabled={isPending}>
      {isPending ? "Syncing..." : "Sync"}
    </Button>
  );
}
