// components/ActionsCell.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentWithURLs } from "@/lib/download/download-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Trash2, Link as LinkIcon, Copy, Edit, Download } from "lucide-react";
import { DeleteDocumentDialog } from "./delete-document-dialog";
import { EditDocumentDialog } from "../edit-document-dialog";
import { ThunderDownload } from "../thunder-download";
import { toast } from "sonner";
// import { useLoading } from "@/app/context/loading-context";

interface ActionsCellProps {
  document: DocumentWithURLs;
}

export function ActionsCell({ document }: ActionsCellProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  // const { showLoader, hideLoader, updateLoadingMessage } = useLoading();
  // 1. 创建处理复制链接的函数
  const handleCopyLinks = () => {
    // 提取所有 URL
    const urls = document.downloadURLs.map(item => item.url);
    if (urls.length > 0) {
      // 将 URL 数组用换行符连接成一个字符串
      const linksText = urls.join('\n');
      navigator.clipboard.writeText(linksText)
        .then(() => {
          toast.success("下载链接已复制到剪贴板！");
        })
        .catch(err => {
          toast.error("复制失败，请检查浏览器权限。");
          console.error('Could not copy text: ', err);
        });
    } else {
      toast.warning("没有可复制的下载链接。");
    }
  };

  const handleDownload = async () => {
    const formData = new FormData();

    const downloadImmediately = true;
    formData.append("downloadImmediately", String(downloadImmediately));

    try {
      const response = await fetch(`/api/download/${document.id}`, {
        method: "PUT",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "更新失败");
      }

      toast.success("下载任务已提交");
      router.refresh();
      // setOpen(false);
    } catch (error: any) {
      console.error('[Edit] 错误:', error);
      toast.error(`下载任务提交失败: ${error.message}`);
    } finally {
      // setIsSubmitting(false);
    }
  };

  // 处理迅雷下载
  const handleThunderDownload = async () => {
    if (typeof window === 'undefined' || !window.thunderLink) {
      toast.error("迅雷下载器未安装，请先安装迅雷客户端");
      return;
    }

    try {
      // 将文档的所有URL合并到一个任务中
      const tasks = document.downloadURLs.map(urlItem => ({
        url: urlItem.url,
        name: document.title || `下载_${Date.now()}`,
      }));

      if (tasks.length === 0) {
        toast.warning("没有可下载的链接");
        return;
      }

      console.log('合并后的任务列表:', tasks);
      console.log('任务总数:', tasks.length);

      await window.thunderLink.newTask({
        downloadDir: 'cinex下载',
        taskGroupName: document.title || '下载任务',
        tasks: tasks,
      });

      toast.success(`成功添加 ${tasks.length} 个下载任务到迅雷`);
    } catch (error) {
      console.error('迅雷下载错误:', error);
      toast.error("下载任务添加失败，请检查迅雷客户端状态");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>操作</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={handleDownload}
          >
            <Download className="mr-2 h-4 w-4" />
            <span>立即下载</span>
          </DropdownMenuItem>
          
          {/* 2. 添加新的菜单项 */}
          <DropdownMenuItem onClick={handleCopyLinks}>
            <LinkIcon className="mr-2 h-4 w-4" />
            <span>复制下载链接</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(document.id)}
          >
            <Copy className="mr-2 h-4 w-4" />
            <span>复制文档ID</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {
            const editTrigger = window.document.getElementById(`edit-trigger-${document.id}`);
            if (editTrigger) {
              editTrigger.click();
            }
          }}>
            <Edit className="mr-2 h-4 w-4" />
            <span>编辑</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => {
            // 手动触发迅雷下载
            handleThunderDownload();
          }}>
            <Download className="mr-2 h-4 w-4" />
            <span>迅雷</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-500 focus:bg-red-100 focus:text-red-600"
            onSelect={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>删除</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteDocumentDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        documentId={document.id}
        documentTitle={document.title}
        onSuccess={() => {
          setShowDeleteDialog(false);
          router.refresh();
        }}
      />

      <EditDocumentDialog
        document={document}
        trigger={
          <div style={{ display: 'none' }} id={`edit-trigger-${document.id}`}>
            编辑
          </div>
        }
      />
    </>
  );
}