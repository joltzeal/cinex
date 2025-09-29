// components/downloader-card.tsx
'use client';

import { useState, useTransition, useActionState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Loader2, PlugZap, Settings, X, XCircle, Star } from 'lucide-react';
import { updateDownloaderSetting, toggleDownloaderEnabled, DownloaderName, testDownloaderConnection, DownloaderConfig } from '@/lib/downloader';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/utils';
import React from 'react';

// 用于提交按钮的加载状态
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? '保存中...' : '保存'}
    </Button>
  );
}

interface DownloaderCardProps {
  icon: React.ReactNode;
  title: string;
  // 【修改1】downloaderName 是必须的，用于标识这是哪个下载器
  downloaderName: DownloaderName; 
  // 【修改2】settings 变为可选的，因为初始可能没有
  settings?: DownloaderConfig | null;
}

export function DownloaderCard({ icon, title, downloaderName, settings: initialSettings }: DownloaderCardProps) {
  // 【修改3】判断是否为新配置（即没有初始数据或主机为空）
  const isNew = !initialSettings || !initialSettings.host;

  // 【修改4】创建一个 settings 对象来驱动 UI。
  // 如果有 initialSettings，就用它；否则，创建一个代表"未配置"的默认对象。
  const settings = initialSettings || {
    name: downloaderName,
    enabled: false,
    host: '',
    port: null,
    username: '',
    password: '', // 密码字段应始终为空，以避免泄露
    isDefault: false,
  };
  
  // 状态管理
  const [isSwitchPending, startSwitchTransition] = useTransition();
  const [isTesting, startTestTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // 表单状态
  const [state, formAction] = useActionState(updateDownloaderSetting, { message: '' });

  // 处理开关切换
  const handleSwitchChange = (checked: boolean) => {
    // 如果是新配置，不允许直接开启
    if (isNew) return;
    startSwitchTransition(() => {
      toggleDownloaderEnabled(settings.name as DownloaderName, checked);
    });
  };

  // 处理测试连接
  const handleTestConnection = () => {
    // 如果是新配置，无法测试
    if (isNew) return;
    setTestResult(null);
    startTestTransition(async () => {
      const result = await testDownloaderConnection(settings.name as DownloaderName);
      setTestResult(result);
    });
  };

  // 表单成功提交后关闭对话框
  React.useEffect(() => {
    // 假设成功的消息包含 '成功'
    if (state?.message && state.message.includes('成功')) {
      setDialogOpen(false);
      // 重置测试结果，因为配置已更改
      setTestResult(null);
    }
  }, [state]);

  return (
    <Card className="w-[500px] h-[350px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className='w-10 h-10'>{icon}</div>
            {title}
            {settings.isDefault && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-xs text-yellow-600 font-medium">默认</span>
              </div>
            )}
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={handleSwitchChange}
            // 【修改5】如果是新配置，禁用开关
            disabled={isSwitchPending || isNew}
            aria-label={`Enable or disable ${title}`}
          />
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-grow flex flex-col justify-between">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">状态:</span>
            {/* 【修改6】根据是否是新配置显示不同状态 */}
            {isNew ? (
              <span className="font-semibold text-orange-500">未配置</span>
            ) : (
              <span className={cn('font-semibold', settings.enabled ? 'text-green-500' : 'text-red-500')}>
                {settings.enabled ? '已启用' : '已禁用'}
              </span>
            )}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">主机:</span>
            {/* 使用 ?? 操作符提供默认显示 */}
            <span>{settings.host || <span className="text-muted-foreground">N/A</span>}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">端口:</span>
            <span>{settings.port || <span className="text-muted-foreground">N/A</span>}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">用户名:</span>
            <span>{settings.username || <span className="text-muted-foreground">N/A</span>}</span>
          </div>
        </div>

        {testResult && (
          <div className={cn(
            "mt-2 p-2 rounded-md text-xs flex items-center justify-between gap-2",
            testResult.success ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          )}>
            <div className="flex items-center gap-2">
              {testResult.success ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              <p>{testResult.message}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setTestResult(null)}>
              <X size={14} />
            </Button>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleTestConnection} disabled={isTesting || isNew}>
          {isTesting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PlugZap className="mr-2 h-4 w-4" />
          )}
          测试连接
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Settings className="mr-2 h-4 w-4" />
              {/* 【修改7】按钮文本根据是否新配置变化 */}
              {isNew ? '配置' : '修改'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form action={formAction}>
              <DialogHeader>
                <DialogTitle>{title} 设置</DialogTitle>
                <DialogDescription>
                  在此处配置您的 {title} 下载器。点击保存后生效。
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* 【修改8】使用 downloaderName 保证表单总能提交正确的 name */}
                <input type="hidden" name="name" value={downloaderName} />
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="host" className="text-right">主机</Label>
                  <Input id="host" name="host" defaultValue={settings.host ?? ''} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="port" className="text-right">端口</Label>
                  <Input id="port" name="port" type="number" defaultValue={settings.port ?? ''} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="username" className="text-right">用户名</Label>
                  <Input id="username" name="username" defaultValue={settings.username ?? ''} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">密码</Label>
                  <Input id="password" name="password" type="password" placeholder={initialSettings?.password ? "留空则不修改" : ""} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="enabled" className="text-right">启用</Label>
                  <div className="col-span-3">
                    <Switch id="enabled" name="enabled" defaultChecked={settings.enabled} />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="isDefault" className="text-right">设为默认</Label>
                  <div className="col-span-3">
                    <Switch id="isDefault" name="isDefault" defaultChecked={settings.isDefault} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                {state?.message && !state.message.includes('成功') && <p className="text-sm text-red-500 mr-auto">{state.message}</p>}
                <SubmitButton />
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}