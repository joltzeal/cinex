"use client";

import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function StarPost({ forumId, threadId, postId, star }: { forumId: string, threadId: string, postId: string, star: boolean }) {
  
  // 组件内部的收藏状态，以 props.star 作为初始值
  const [isStar, setIsStar] = useState(star);

  // 使用 useEffect 来同步外部 prop 的变化到内部 state
  // 当父组件传入的 star 值改变时，这个组件的状态也会随之更新
  useEffect(() => {
    console.log(star);
    setIsStar(star);
  }, [star]);

  const handleStar = async () => {
    const response = await fetch(`/api/forum/${forumId}/thread/${threadId}/${postId}/star`, {
      method: 'POST',
    });

    if (response.ok) {
      // 在请求成功后，切换本地的收藏状态
      const newStarState = !isStar;
      setIsStar(newStarState);
      
      // 根据【操作后】的状态来显示正确的提示信息
      // 如果 newStarState 是 true，说明刚刚执行了“收藏”操作
      // 如果 newStarState 是 false，说明刚刚执行了“取消收藏”操作
      toast.success(newStarState ? '已收藏' : '已取消收藏');
    } else {
      toast.error('操作失败，请重试');
    }
  }

  return (
    <Button size="sm" className="ml-1" onClick={handleStar}>
      {
        isStar ? <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> : <Star className="h-4 w-4" />
      }
    </Button>
  );
}