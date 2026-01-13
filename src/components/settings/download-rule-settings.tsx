'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from "sonner";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';

const downloadRuleSchema = z.object({
  // 下载规则
  onlyChineseSubtitles: z.boolean(),
  onlyHD: z.boolean(),
  // 订阅规则
  checkForDuplicates: z.boolean(),
  onlySingleMovie: z.boolean(),
  downloadVR: z.boolean(),
  downloadMagnetImmediately: z.boolean(),
});

type DownloadRuleFormValues = z.infer<typeof downloadRuleSchema>;

interface DownloadRuleSettingsProps {
  initialData?: DownloadRuleFormValues | null;
}

// --- 主组件 ---

export function DownloadRuleSettings({ initialData }: DownloadRuleSettingsProps) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<DownloadRuleFormValues>({
    resolver: zodResolver(downloadRuleSchema),
    defaultValues: initialData || {
      onlyChineseSubtitles: false,
      onlyHD: true,
      checkForDuplicates: true,
      onlySingleMovie: true,
      downloadVR: false,
      downloadMagnetImmediately: true,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData, form.reset]);

  const onSubmit = async (values: DownloadRuleFormValues) => {
    setIsSaving(true);
    try {
      console.log('正在提交的数据:', values);
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'downloadRuleConfig',
          value: values,
        }),
      });
      if (response.ok) {
        toast.info('下载规则已成功保存！');
      } else {
        toast.error('保存失败，请重试。');
      }
      form.reset(values);
    } catch (error) {
      toast.error('保存时发生网络错误');
    } finally {
      setIsSaving(false);
    }
  };

  // --- 优化后的 UI 渲染 ---
  return (
    <Card>
      <CardHeader>
        <CardTitle>下载与订阅规则</CardTitle>
        <CardDescription>
          分别配置全局下载筛选规则和针对自动订阅的特定规则。
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent>
            <div className="grid grid-cols-1 gap-10 md:grid-cols-2">

              {/* === 左侧：下载规则 === */}
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-medium tracking-tight">下载规则</h3>
                  <p className="text-sm text-muted-foreground">
                    这些规则将应用于所有手动和自动的下载任务。
                  </p>
                </div>
                <FormField control={form.control} name="onlyChineseSubtitles" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">仅中文字幕</FormLabel>
                      <FormDescription>只选择明确标有“字幕”的资源。</FormDescription>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="onlyHD" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">仅高清画质</FormLabel>
                      <FormDescription>只选择明确标有“HD”的资源。</FormDescription>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                  
                )} />
                <FormField control={form.control} name="downloadMagnetImmediately" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">磁力链接立即下载</FormLabel>
                      <FormDescription>开启后会立即下载磁力链接，默认立即下载</FormDescription>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                  
                )} />
              </div>

              {/* === 右侧：订阅规则 === */}
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-medium tracking-tight">订阅规则</h3>
                  <p className="text-sm text-muted-foreground">
                    这些规则仅在通过 RSS 或其他方式自动订阅时生效。
                  </p>
                </div>
                <FormField control={form.control} name="checkForDuplicates" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">检查重复资源</FormLabel>
                      <FormDescription>下载前检查媒体库，避免重复下载。</FormDescription>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="onlySingleMovie" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">仅下载单体影片</FormLabel>
                      <FormDescription>订阅时，跳过系列合集/个人合集/写真。</FormDescription>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="downloadVR" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">下载VR影片</FormLabel>
                      <FormDescription>开启后会下载VR影片，默认不下载</FormDescription>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                  
                )} />
              </div>

            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4 mt-6">
            <div className="flex w-full justify-end">
              <Button type="submit" disabled={isSaving || !form.formState.isDirty}>
                {isSaving ? '保存中...' : '保存更改'}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}