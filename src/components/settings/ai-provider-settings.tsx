'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { Bot, Globe, KeyRound } from 'lucide-react';

// 1. 定义 AI Provider 配置的 Zod Schema
const formSchema = z.object({
  baseURL: z.string().min(1, '请输入 URL 地址').refine((val) => {
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }, '请输入有效的 URL 地址'),
  apiKey: z.string().min(1, 'API Key 不能为空'),
  modelName: z.string().min(1, '模型名称不能为空'),
});

type FormValues = z.infer<typeof formSchema>;

interface AiProviderSettingsProps {
  initialData?: FormValues;
}

export function AiProviderSettingsComponent({ initialData }: AiProviderSettingsProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      baseURL: 'https://api.x.ai/v1',
      apiKey: '',
      modelName: 'grok-4-0709',
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData, form.reset]);

  const handleTestConnection = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error('请先填写所有必填项。');
      return;
    }

    setIsTesting(true);
    const values = form.getValues();
    try {
      const response = await fetch('/api/settings/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(result.message || 'AI Provider 连接成功！');
      } else {
        toast.error(result.message || '测试连接失败，请检查配置或API Key。');
      }
    } catch (error) {
      toast.error('网络请求失败，请检查您的网络或Next.js服务器。');
    } finally {
      setIsTesting(false);
    }
  };

  // 4. 定义表单提交（保存）的处理函数
  const onSubmit = async (values: FormValues) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'aiProviderConfig', // 使用新的 key 保存到数据库
          value: values,
        }),
      });

      if (response.ok) {
        toast.success('AI Provider 设置已成功保存！');
      } else {
        toast.error('保存失败，请重试。');
      }
    } catch (error) {
      toast.error('保存时发生网络错误。');
    } finally {
      setIsSaving(false);
    }
  };

  const iconStyle = "h-4 w-4 text-muted-foreground";
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Provider</CardTitle>
        <CardDescription>配置用于文件整理和分析的 AI 模型提供商。</CardDescription>
      </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">

              <FormField
                control={form.control}
                name="baseURL"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base URL</FormLabel>
                    <FormControl>
                      <InputWithIcon
                        icon={<Globe className={iconStyle} />}
                        placeholder="例如：https://api.x.ai/v1"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key</FormLabel>
                    <FormControl>
                      <InputWithIcon
                        icon={<KeyRound className={iconStyle} />}
                        type="password"
                        placeholder="请输入您的 API Key"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="modelName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model Name</FormLabel>
                    <FormControl>
                      <InputWithIcon
                        icon={<Bot className={iconStyle} />}
                        placeholder="例如：grok-4-0709"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </CardContent>
            <CardFooter className="flex justify-end space-x-2 my-4">
              <Button type="button" variant="outline" onClick={handleTestConnection} disabled={isTesting}>
                {isTesting ? '测试中...' : '测试连接'}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? '保存中...' : '保存'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
  );
}