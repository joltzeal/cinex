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
import { DocumentWithURLs } from "@/lib/download/download-data";
import { Edit } from "lucide-react";

// 编辑表单的 Schema
export const editFormSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  images: z.array(z.instanceof(File)).optional(),
  downloadURLs: z.array(
    z.object({
      url: z.string().refine(val => val.trim() !== '', { message: "链接不能为空" }),
    })
  ).min(1, { message: "至少提供一个下载链接" }),
});

interface EditDocumentDialogProps {
  document: DocumentWithURLs;
  trigger?: React.ReactNode;
}

export function EditDocumentDialog({ document, trigger }: EditDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof editFormSchema>>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      title: document.title || "",
      description: document.description || "",
      images: [],
      downloadURLs: document.downloadURLs.map(url => ({ url: url.url })),
    },
  });

  // 处理粘贴多个链接的功能
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

    const pastedText = event.clipboardData?.getData("text/plain");
    if (!pastedText) return;

    const potentialUrls = pastedText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '');

    if (potentialUrls.length > 0) {
      event.preventDefault();
      const formattedUrls = potentialUrls.map(url => ({ url }));
      form.setValue('downloadURLs', formattedUrls, { shouldValidate: true });
      toast.info(`已成功粘贴 ${potentialUrls.length} 个下载链接！`);
    }
  }, [form]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [open, handlePaste]);

  const resetForm = () => {
    form.reset({
      title: document.title || "",
      description: document.description || "",
      images: [],
      downloadURLs: document.downloadURLs.map(url => ({ url: url.url })),
    });
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    setOpen(isOpen);
  };

  async function onSubmit(values: z.infer<typeof editFormSchema>) {
    setIsSubmitting(true);

    const formData = new FormData();
    if (values.title && values.title.trim() !== "") formData.append("title", values.title);
    if (values.description) formData.append("description", values.description);
    if (values.images && values.images.length > 0) {
      values.images.forEach((file) => formData.append("images", file));
    }
    const validURLs = values.downloadURLs.map(item => item.url.trim()).filter(Boolean);
    formData.append("downloadURLs", JSON.stringify(validURLs));

    try {
      const response = await fetch(`/api/download/${document.id}`, {
        method: "PUT",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "更新失败");
      }

      toast.success("文档更新成功！");
      router.refresh();
      setOpen(false);
    } catch (error: any) {
      console.error('[Edit] 错误:', error);
      toast.error(`更新失败: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            编辑
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>编辑文档</DialogTitle>
          <DialogDescription>
            修改文档的标题、描述、图片和下载链接。
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

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>标题</FormLabel>
                    <FormControl>
                      <Input placeholder="文档标题" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>描述</FormLabel>
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
                    <FormLabel>上传图片</FormLabel>
                    <FormControl>
                      <ImageUploader value={field.value || []} onChange={field.onChange} />
                    </FormControl>
                    <FormDescription>
                      上传新的图片将替换现有图片。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "更新中..." : "更新"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
