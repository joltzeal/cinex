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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FolderOpen, Globe, Lock, Milestone, Server, User } from 'lucide-react';

// 1. 定义 Zod Schema 进行表单验证
const formSchema = z.object({
  type: z.enum(['jellyfin', 'emby']),
  name: z.string().optional(),
  protocol: z.enum(['http', 'https']),
  address: z.string().min(1, '服务器地址不能为空'),
  port: z.number().min(1, '端口号必须大于0'),
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().optional(),
  publicAddress: z.string().optional(),
  path: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// 定义组件 Props，接收从服务器加载的初始数据
interface MediaServerSettingsProps {
  initialData?: FormValues;
}

export function MediaServerSettingsComponent({ initialData }: MediaServerSettingsProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 2. 初始化 useForm
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      type: 'jellyfin',
      protocol: 'http',
      address: '',
      port: 8096,
      username: '',
      password: '',
      path: '',
      publicAddress: '',
    },
  });

  // 3. 定义测试连接的处理函数
  const handleTestConnection = async () => {
    // 触发关键字段验证
    const isValid = await form.trigger(['address', 'port', 'username']);
    if (!isValid) {
      toast.error('请先填写服务器地址、端口和用户名。');
      return;
    }


    setIsTesting(true);
    const values = form.getValues();
    try {
      const response = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol: values.protocol,
          address: values.address,
          port: values.port,
          path: values.path,
          username: values.username,
          password: values.password,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {

        // ✨ 核心逻辑：检查并回填服务器名称 ✨
        if (result.serverName) {
          form.setValue('name', result.serverName, { shouldValidate: true });
          toast.info(`已自动填充服务器名称: ${result.serverName}`);
        }
      } else {
        toast.error(result.message || '测试连接失败');
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
          key: 'mediaServerConfig',
          value: values,
        }),
      });

      if (response.ok) {
        toast.success('设置已成功保存！');
      } else {
        toast.error('保存失败，请重试。');
      }
    } catch (error) {
      toast.error('保存时发生网络错误。');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    // 检查 initialData 是否存在 (从 undefined/null 变为有值的对象)
    if (initialData) {
      // 当 initialData 变化时，用新数据重置表单
      form.reset(initialData);
    }
    // 依赖项数组确保这个 effect 只在 initialData 或 form.reset 函数变化时运行
  }, [initialData, form.reset]);
  const iconStyle = "h-4 w-4 text-muted-foreground";
  return (
    <Card>
      <CardHeader>
        <CardTitle>媒体服务器</CardTitle>
        <CardDescription>连接到您的 Jellyfin 或 Emby 服务器以同步媒体库。</CardDescription>
      </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-8">

              {/* --- 逻辑分组 1: 服务类型 & 名称 --- */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>服务类型</FormLabel>
                      <FormControl>
                        <Tabs
                          defaultValue={field.value}
                          onValueChange={(value) => field.onChange(value as 'jellyfin' | 'emby')}
                        >
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="jellyfin">Jellyfin</TabsTrigger>
                            <TabsTrigger value="emby">Emby</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>名称 (选填)</FormLabel>
                      <FormControl>
                        <InputWithIcon
                          icon={<Server className={iconStyle} />}
                          placeholder="例如：客厅的 Jellyfin"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* --- 逻辑分组 2: 连接地址 (组合式输入) --- */}
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">连接地址</label>
                <div className="mt-2 flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name="protocol"
                    render={({ field }) => (
                      <FormItem className="w-30">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="协议" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="http">HTTP</SelectItem>
                            <SelectItem value="https">HTTPS</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="grow">
                        <FormControl>
                          <InputWithIcon
                            icon={<Globe className={iconStyle} />}
                            placeholder="192.168.1.100 或 media.example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="absolute" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="port"
                    render={({ field }) => (
                      <FormItem className="w-25">
                        <FormControl>
                          <InputWithIcon
                            icon={<Milestone className={iconStyle} />}
                            type="number"
                            placeholder="端口"
                            {...field}
                            value={field.value}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage className="absolute" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* --- 逻辑分组 3: 用户凭据 --- */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>用户名</FormLabel>
                      <FormControl>
                        <InputWithIcon
                          icon={<User className={iconStyle} />}
                          placeholder="admin"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>密码 (选填)</FormLabel>
                      <FormControl>
                        <InputWithIcon
                          icon={<Lock className={iconStyle} />}
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="path"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>路径 (选填)</FormLabel>
                      <FormControl>
                        <InputWithIcon
                          icon={<FolderOpen className={iconStyle} />}
                          placeholder="/jellyfin"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="publicAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>公网地址 (选填)</FormLabel>
                      <FormControl>
                        <InputWithIcon
                          icon={<FolderOpen className={iconStyle} />}
                          placeholder="192.168.1.100 或 example.com"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* --- 逻辑分组 4: 高级选项 --- */}


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