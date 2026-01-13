"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface DeleteDocumentDialogProps {
  isOpen: boolean; // 1. 接收 open 状态
  onClose: () => void; // 2. 接收关闭回调
  documentId: string;
  documentTitle: string;
  onSuccess: () => void;
}

export function DeleteDocumentDialog({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  onSuccess,
}: DeleteDocumentDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/download/${documentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "删除失败");
      }

      toast.success(`文档 "${documentTitle}" 已成功删除。`);
      onSuccess(); // 调用父组件传入的刷新和关闭函数
    } catch (error: any) {
      toast.error(`删除失败: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // 3. 使用 onOpenChange 来同步状态
  // 这使得点击遮罩层或按 ESC 键也能正确关闭
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      {/* 这里不再需要 Trigger，因为它是被外部状态控制的 */}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确定要删除吗？</AlertDialogTitle>
          <AlertDialogDescription>
            此操作无法撤销。这将永久删除文档
            <span className="font-semibold"> "{documentTitle}" </span>
            及其所有关联的下载链接。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* 4. 取消按钮直接调用 onClose */}
          <AlertDialogCancel onClick={onClose} disabled={isDeleting}>
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                删除中...
              </>
            ) : (
              "确认删除"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}