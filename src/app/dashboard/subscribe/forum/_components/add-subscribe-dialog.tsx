"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

interface ParsedUrl {
  forumId: string;
  threadId: string;
}

/**
 * 从 URL 中解析 forumId 和 threadId
 * 支持格式：
 * - https://hjd2048.com/2048/thread.php?fid=15 -> { forumId: '2048', threadId: '15' }
 * - https://www.sehuatang.net/forum-95-1.html -> { forumId: 'sehuatang', threadId: '95' }
 */
function parseForumUrl(url: string): ParsedUrl | null {
  try {
    const urlObj = new URL(url);

    
    
    // 检查是否是 2048 论坛
    if (urlObj.hostname.includes('hjd2048') || urlObj.hostname.includes('2048')) {
      const fidMatch = urlObj.searchParams.get('fid');
      if (fidMatch) {
        return {
          forumId: '2048',
          threadId: fidMatch,
        };
      }
    }
    
    // 检查是否是色花堂论坛
    if (urlObj.hostname.includes('sehuatang')) {
      // 匹配 forum-95-1.html 格式
      const match = urlObj.pathname.match(/forum-(\d+)-\d+\.html/);
      if (match) {
        return {
          forumId: 'sehuatang',
          threadId: match[1],
        };
      }
    }

    if (urlObj.hostname.includes('t66y')) {
      const fidMatch = urlObj.searchParams.get('fid');
      if (fidMatch) {
        return {
          forumId: 't66y',
          threadId: fidMatch,
        };
      }
    }

    if (urlObj.hostname.includes('javbus')) {
      const fidMatch = urlObj.searchParams.get('fid');
      if (fidMatch) {
        return {
          forumId: 'javbus',
          threadId: fidMatch,
        };
      }
    }
    if (urlObj.hostname.includes('south-plus')) {
      // thread.php?fid-9.html
      const fidMatch = urlObj.href.match(/thread\.php\?fid-(\d+)\.html/);
      if (fidMatch) {
        return {
          forumId: 'southPlus',
          threadId: fidMatch[1],
        };
      }
      // const fidMatch = urlObj.searchParams.get('fid');
      // if (fidMatch) {
      //   return {
      //     forumId: 'northPlus',
      //     threadId: fidMatch,
      //   };
      // }
    }
    return null;
  } catch (error) {
    return null;
  }
}

export function AddSubscribeDialog() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error("请输入论坛 URL");
      return;
    }

    const parsed = parseForumUrl(url);
    
    if (!parsed) {
      toast.error("无法解析 URL，请检查格式是否正确");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/forum/${parsed.forumId}/thread/${parsed.threadId}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '添加订阅失败');
      }

      toast.success("订阅添加成功！");
      setUrl("");
      setOpen(false);
      router.refresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '添加订阅时发生错误';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          添加订阅
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-131.25">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>添加论坛订阅</DialogTitle>
            <DialogDescription>
              输入论坛帖子列表的 URL 来添加订阅
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="url">论坛 URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://hjd2048.com/2048/thread.php?fid=15"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                支持的格式：
                <br />
                • 2048: https://hjd2048.com/2048/thread.php?fid=15
                <br />
                • 色花堂: https://www.sehuatang.net/forum-95-1.html
                <br />
                • 草榴社区: https://t66y.com/thread0806.php?fid=7
                <br />
                • JavBus: https://www.javbus.com/forum/forum.php?mod=forumdisplay&fid=2
                <br />
                • 南+: https://www.south-plus.net/thread.php?fid-9.html
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "添加中..." : "添加订阅"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

