'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PlayCircle, Loader2 } from 'lucide-react';

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SCHEDULED_TASKS } from '@/constants/data';
import { getNextExecutionDescription } from '@/lib/cron-utils';

// 定义我们的任务列表，信息直接从 scheduler.ts 中提取
// const scheduledTasks = [
//   {
//     id: 'javbus-subscribe-update',
//     name: 'JAVBus 订阅更新',
//     description: '扫描所有 JAVBus 订阅源，查找并保存新的影片。',
//     schedule: '0 */12 * * *',
//     humanSchedule: '每小时整点',
//   },
//   {
//     id: 'javbus-movie-update',
//     name: 'JAVBus 影片更新',
//     description: '为已订阅的影片获取磁力链接并发送下载请求。',
//     schedule: '30 */6 * * *',
//     humanSchedule: '仅手动或启动时执行',
//   },
//   {
//     id: 'download-status-sync',
//     name: '下载状态同步',
//     description: '与下载器客户端同步，更新数据库中所有任务的下载状态。',
//     schedule: '5 * * * *',
//     humanSchedule: '每 5 分钟',
//   },
//   {
//     id: 'forum-update',
//     name: '论坛更新',
//     description: '更新论坛中的帖子。',
//     schedule: '0 */12 * * *',
//     humanSchedule: '每 12 小时',
//   },
//   {
//     id: 'media-library-sync',
//     name: '媒体库同步',
//     description: '同步媒体库中的影片到数据库。',
//     schedule: '35 * * * *',
//     humanSchedule: '每 5 分钟',
//   }
// ];

export function AdvancedSettings() {
  // 使用一个对象来独立管理每个任务的加载状态
  const [loadingTasks, setLoadingTasks] = useState<Record<string, boolean>>({});

  const handleRunTask = async (taskType: string, taskName: string) => {
    // 设置当前任务为加载中状态
    setLoadingTasks(prev => ({ ...prev, [taskType]: true }));

    try {
      const response = await fetch('/api/scheduler/run-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskType }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(`任务 "${taskName}" 已成功触发！`, {
          description: '任务正在后台执行，请稍后查看日志或通知。',
        });
      } else {
        toast.error(`触发任务 "${taskName}" 失败`, {
          description: result.message || '请检查服务器日志获取更多信息。',
        });
      }
    } catch (error) {
      toast.error('网络请求失败', {
        description: '无法连接到服务器，请检查您的网络连接。',
      });
    } finally {
      // 无论成功或失败，都取消加载状态
      setLoadingTasks(prev => ({ ...prev, [taskType]: false }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>定时任务管理</CardTitle>
        <CardDescription>
          查看系统后台运行的定时任务。您可以手动触发任何任务以立即执行。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>任务名称</TableHead>
                <TableHead className="hidden sm:table-cell">计划</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SCHEDULED_TASKS.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <div className="font-medium">{task.name}</div>
                    <div className="text-sm text-muted-foreground hidden md:inline">
                      {task.description}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>{getNextExecutionDescription(task.schedule)}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Cron 表达式: {task.schedule}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRunTask(task.id, task.name)}
                      disabled={loadingTasks[task.id]}
                    >
                      {loadingTasks[task.id] ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <PlayCircle className="mr-2 h-4 w-4" />
                      )}
                      {loadingTasks[task.id] ? '执行中...' : '手动执行'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TooltipProvider>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          任务将在后台异步执行，触发后即可离开此页面。执行结果将通过系统日志和消息推送进行通知。
        </p>
      </CardFooter>
    </Card>
  );
}