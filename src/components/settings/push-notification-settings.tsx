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
import { Globe, User, KeyRound } from 'lucide-react';

// 定义推送通知配置的 Zod Schema
const formSchema = z.object({
  domain: z.string().min(1, '域名不能为空').regex(/^[a-zA-Z0-9.-]+$/, '请输入有效的域名'),
  username: z.string().min(1, '用户名不能为空'),
  token: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// 定义组件 Props
interface PushNotificationSettingsProps {
  initialData?: FormValues;
}

export function PushNotificationSettingsComponent({ initialData }: PushNotificationSettingsProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 初始化 useForm
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      domain: '',
      username: '',
      token: '',
    },
  });

  useEffect(() => {
    // 检查 initialData 是否存在 (从 undefined/null 变为有值的对象)
    if (initialData) {
      // 当 initialData 变化时，用新数据重置表单
      form.reset(initialData);
    }
    // 依赖项数组确保这个 effect 只在 initialData 或 form.reset 函数变化时运行
  }, [initialData, form.reset]);

  // 定义测试连接的处理函数
  const handleTestConnection = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error('请先填写所有必填项。');
      return;
    }

    setIsTesting(true);
    const values = form.getValues();
    try {
      const response = await fetch('/api/settings/push/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // toast.success(result.message || '推送服务连接成功！');
      } else {
        toast.error(result.message || '测试连接失败，请检查配置。');
      }
    } catch (error) {
      toast.error('网络请求失败，请检查您的网络或Next.js服务器。');
    } finally {
      setIsTesting(false);
    }
  };

  // 定义表单提交（保存）的处理函数
  const onSubmit = async (values: FormValues) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'pushNotificationConfig',
          value: values,
        }),
      });

      if (response.ok) {
        toast.success('推送通知设置已成功保存！');
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
    <>
      {/* <Toaster position="top-center" richColors /> */}
      <Card>
        <CardHeader>
          <CardTitle>消息推送设置</CardTitle>
          <CardDescription>配置用于发送任务通知和系统消息的推送服务。</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              
              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>推送服务域名</FormLabel>
                    <FormControl>
                      <InputWithIcon
                        icon={<Globe className={iconStyle} />}
                        placeholder="例如：push.mydomain.cn"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>用户名</FormLabel>
                    <FormControl>
                      <InputWithIcon
                        icon={<User className={iconStyle} />}
                        placeholder="例如：admin"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>推送令牌 (可选)</FormLabel>
                    <FormControl>
                      <InputWithIcon
                        icon={<KeyRound className={iconStyle} />}
                        type="password"
                        placeholder="请输入推送令牌（如果设置了的话）"
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
                {isTesting ? '发送中...' : '发送测试消息'}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? '保存中...' : '保存'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </>
  );
}
