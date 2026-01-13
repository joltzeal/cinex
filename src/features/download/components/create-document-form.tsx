"use client";
import { useState, useEffect, useCallback } from "react";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ImageUploader } from "@/components/image-uploader";
import { DownloadURLInput } from "@/components/download-url-input";
// import { useLoading } from "@/app/context/loading-context";


// 🔥 1. 定义 SSE 消息的类型接口
interface SseProgress {
  stage: 'AI_START' | 'AI_COMPLETE' | 'DOWNLOAD_SUBMIT' | 'PROGRESS' | 'DONE' | 'ERROR';
  message: string;
  data?: any;
}


// 1. 更新 Schema，将 title 和 images 设为可选
export const formSchema = z.object({
  title: z.string().optional(), // 移除 .min(1)
  description: z.string().optional(),
  images: z.array(z.instanceof(File)).optional(), // 移除 .min(1)
  downloadURLs: z.array(
    // URL 必须是有效链接，但我们过滤空字符串
    z.object({
      url: z.string().refine(val => val.trim() !== '', { message: "链接不能为空" }),
    })
  ).min(1, { message: "至少提供一个下载链接" }),
  downloadImmediately: z.boolean().default(false).optional(),
});

export function CreateDocumentDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState<SseProgress[]>([]);
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      images: [],
      downloadURLs: [{ url: "" }],
      downloadImmediately: false,
    },
  });

  // 使用 useCallback 进行性能优化，确保函数引用稳定
  const handlePaste = useCallback((event: ClipboardEvent) => {
    // 检查是否有输入框聚焦
    const activeElement = window.document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      (activeElement as HTMLElement).contentEditable === 'true'
    );

    // 如果有输入框聚焦，不处理粘贴逻辑，让默认行为处理
    if (isInputFocused) {
      return;
    }

    // 检查是否粘贴的是图片
    const items = event.clipboardData?.items;
    if (items) {
      let hasImage = false;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          hasImage = true;
          break;
        }
      }
      // 如果粘贴的是图片，不处理URL粘贴逻辑
      if (hasImage) {
        return;
      }
    }

    // 从剪贴板获取文本数据
    const pastedText = event.clipboardData?.getData("text/plain");

    if (!pastedText) {
      return;
    }

    // 将文本按行分割，并清理掉空行和首尾空格
    const potentialUrls = pastedText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '');

    // 检查是否粘贴了多个链接
    if (potentialUrls.length > 0) {
      // 阻止默认的粘贴行为（例如，粘贴到某个输入框中）
      event.preventDefault();

      // 将链接数组转换为符合 react-hook-form 格式的数组
      const formattedUrls = potentialUrls.map(url => ({ url }));

      // 使用 setValue 更新表单状态，这会自动触发 UI 刷新
      form.setValue('downloadURLs', formattedUrls, { shouldValidate: true });

      // 给用户一个友好的提示
      toast.info(`已成功粘贴 ${potentialUrls.length} 个下载链接！`);
    }
  }, [form]); // 依赖项是 form，因为我们用到了 form.setValue
  // const { showLoader, hideLoader, updateLoadingMessage } = useLoading();
  // 3. 使用 useEffect 来添加和移除事件监听器
  useEffect(() => {
    // 只在对话框打开时才监听事件
    if (!open) {
      return;
    }

    // 在 window 上添加 'paste' 事件监听器
    window.addEventListener("paste", handlePaste);

    // 清理函数：在组件卸载或对话框关闭时，移除监听器，防止内存泄漏
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [open, handlePaste]); // 依赖项是 open 和 handlePaste

  // 🔥 3. 创建 SSE 监听函数
  const listenToSse = useCallback((id: string) => {
    console.log(`[SSE] 开始监听任务: ${id}`);
    const eventSource = new EventSource(`/api/download/status/${id}`);

    eventSource.onopen = () => {
      console.log(`[SSE] 连接已建立: ${id}`);
      // updateLoadingMessage("已连接到服务器，等待任务开始...");
    };

    eventSource.onmessage = (event) => {
      try {
        console.log(`[SSE] 收到消息:`, event.data);
        const newProgress = JSON.parse(event.data);
        console.log(`[SSE] 解析后的进度:`, newProgress);
        
        // 更新进度数组
        setProgress(prev => [...prev, newProgress]);
        
        // 更新 loader 的文本
        // updateLoadingMessage(`[${newProgress.stage}] ${newProgress.message}`);

        if (newProgress.stage === 'CONNECTED') {
          console.log(`[SSE] 连接确认`);
          // updateLoadingMessage("连接已建立，等待任务开始...");
        } else if (newProgress.stage === 'DONE') {
          console.log(`[SSE] 任务完成，关闭连接`);
          toast.success(newProgress.message || '所有任务处理完毕！');
          eventSource.close();
          
          // hideLoader(); // 隐藏 loader
          setIsSubmitting(false);
          router.refresh();
          setOpen(false);
          resetAllState();
        } else if (newProgress.stage === 'ERROR') {
          console.log(`[SSE] 任务出错，关闭连接`);
          toast.error(newProgress.message || '任务处理时发生错误。');
          eventSource.close();
          // hideLoader(); // 隐藏 loader
          setIsSubmitting(false);
        }
      } catch (error) {
        console.error('SSE 数据解析错误:', error);
        toast.error('接收进度数据时发生错误');
        eventSource.close();
        // hideLoader();
        setIsSubmitting(false);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE 连接错误:', error);
      console.log(`[SSE] EventSource readyState:`, eventSource.readyState);
      
      // 检查连接状态
      if (eventSource.readyState === EventSource.CLOSED) {
        console.log('[SSE] 连接已关闭');
        toast.error('与服务器的进度连接已断开');
        // hideLoader();
        setIsSubmitting(false);
      } else if (eventSource.readyState === EventSource.CONNECTING) {
        console.log('[SSE] 正在尝试重新连接...');
        // updateLoadingMessage("连接断开，正在重新连接...");
      }
    };

    return eventSource;
  }, [router, ]); // 添加 context 函数到依赖项

  // 🔥 4. 重置状态的函数
  const resetAllState = () => {
    form.reset();
    setIsSubmitting(false);
    setTaskId(null);
    setProgress([]);
  };

  // 在弹窗关闭时重置所有状态
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetAllState();
      // hideLoader(); // 确保关闭弹窗时也隐藏 loader
    }
    setOpen(isOpen);
  };

  // 🔥 5. 核心修改：重构 onSubmit 函数
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    setProgress([]); // 开始提交时清空旧进度
    setTaskId(null);

    // FormData 构建逻辑保持不变
    const formData = new FormData();
    if (values.title && values.title.trim() !== "") formData.append("title", values.title);
    if (values.description) formData.append("description", values.description);
    if (values.images && values.images.length > 0) {
      values.images.forEach((file) => formData.append("images", file));
    }
    const validURLs = values.downloadURLs.map(item => item.url.trim()).filter(Boolean);
    formData.append("downloadURLs", JSON.stringify(validURLs));
    formData.append("downloadImmediately", String(values.downloadImmediately));

    // showLoader("正在提交任务...");

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "创建失败");
      }
      
      if (response.status === 202 && result.taskId) {
        // 异步任务启动，更新 loader 文本并开始监听
        setTaskId(result.taskId); // 设置 taskId
        // updateLoadingMessage("任务已启动，正在连接服务器...");
        console.log(`[Submit] 启动异步任务: ${result.taskId}`);
        listenToSse(result.taskId);
        // **不隐藏 loader**，让 SSE 处理器来控制
      } else {
        // 同步创建成功
        // hideLoader(); // 隐藏 loader
        toast.success(result.message || "文档创建成功！");
        router.refresh();
        setOpen(false);
        setIsSubmitting(false);
      }
    } catch (error: any) {
      console.error('[Submit] 错误:', error);
      // hideLoader(); // 隐藏 loader
      toast.error(`发生错误: ${error.message}`);
      setIsSubmitting(false); // 出错时解锁按钮
    }
    // **移除 finally 块**，因为 isSubmitting 的状态由各个逻辑分支自己控制
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>创建新文档</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>创建新文档</DialogTitle>
          <DialogDescription>
            仅需提供下载链接即可自动获取信息，或手动填写所有字段。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <fieldset disabled={isSubmitting} className="space-y-4">
              <FormField
                control={form.control}
                name="downloadURLs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>下载链接</FormLabel>
                    <FormControl>
                      <DownloadURLInput control={form.control} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 3. 优化 UI/UX */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>标题 (可选)</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：我的项目展示" {...field} />
                    </FormControl>
                    <FormDescription>
                      若留空，将尝试从磁力链接中自动获取标题。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>描述 (可选)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="对文档的简要描述" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>上传图片 (可选)</FormLabel>
                    <FormControl>
                      <ImageUploader value={field.value || []} onChange={field.onChange} />
                    </FormControl>
                    <FormDescription>
                      若留空，将尝试从磁力链接中自动获取封面。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="downloadImmediately"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        立即下载？
                      </FormLabel>
                      <FormDescription>
                        勾选后将立即把链接添加到下载器中。
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </fieldset>
            {taskId && progress.length > 0 && (
              <div className="mt-4 p-4 border rounded-md bg-muted max-h-40 overflow-y-auto">
                <h4 className="font-semibold mb-2 text-sm">任务进度</h4>
                <ul className="space-y-1 text-xs">
                  {progress.map((p, index) => (
                    <li key={index}>
                      <span className="font-medium mr-2">[{p.stage}]</span>
                      <span>{p.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "创建中..." : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}