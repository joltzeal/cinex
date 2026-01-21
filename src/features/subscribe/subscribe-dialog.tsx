'use client';

import { buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
export default function SubscribeDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoSubscribe,setAutoSubscribe] = useState(true)
  const router = useRouter();
  const handleSubmit = async () => {
    if (!url.trim()) {
      toast.error('请输入JAVBUS URL');
      return;
    }

    // 检查URL格式
    if (!url.includes('javbus.com')) {
      toast.error('请输入有效的JAVBUS URL');
      return;
    }

    setIsLoading(true);

    try {
      // 判断URL类型
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: url.trim() ,autoSubscribe:autoSubscribe})
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '请求失败');
      }

      const data = await response.json();
      toast.success('订阅成功！', {
        description: `已添加 ${data.data?.totalAdded || 0} 个新项目`
      });

      setIsOpen(false);
      setUrl('');
      router.refresh();
    } catch (error) {
      console.error('订阅失败:', error);
      toast.error('订阅失败', {
        description: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button className={cn(buttonVariants(), 'text-xs md:text-sm')}>
          <IconPlus className='mr-2 h-4 w-4' /> 添加新订阅
        </button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>添加JAVBUS订阅</DialogTitle>
          <DialogDescription>请输入Javbus URL</DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='url' className='text-right'>
              URL
            </Label>
            <Input
              id='url'
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder='https://www.javbus.com/star/2pv'
              className='col-span-3'
              disabled={isLoading}
            />
            <Label htmlFor='auto-subscribe' className='text-right'>
              自动订阅
            </Label>
            <RadioGroup
              value={autoSubscribe ? "true" : "false"}
              onValueChange={(value) => setAutoSubscribe(value === "true")}
              className='col-span-3 flex gap-6'
            >
              <div className='flex items-center gap-2'>
                <RadioGroupItem value="true" id="auto-on" />
                <Label htmlFor="auto-on" className='cursor-pointer'>开启</Label>
              </div>
              <div className='flex items-center gap-2'>
                <RadioGroupItem value="false" id="auto-off" />
                <Label htmlFor="auto-off" className='cursor-pointer'>关闭</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <button
            type='button'
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            取消
          </button>
          <button
            type='button'
            onClick={handleSubmit}
            disabled={isLoading}
            className={cn(buttonVariants())}
          >
            {isLoading ? '处理中...' : '提交'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
