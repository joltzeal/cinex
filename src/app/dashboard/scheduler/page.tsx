"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import PageContainer from "@/components/layout/page-container";

export default function SchedulerPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<{
    taskType: string;
    timestamp: string;
    status: 'success' | 'error';
    message?: string;
  } | null>(null);

  const runTask = async (taskType: 'daily' | 'javbus' | 'download-sync' | 'javbus-movie') => {
    setIsRunning(true);

    try {
      console.log(taskType);
      
      let endpoint = '/api/scheduler/run-task';
      let body = { taskType };
      
      // 下载状态同步使用不同的端点
      if (taskType === 'download-sync') {
        endpoint = '/api/scheduler/download-sync';
        body = {} as any;
      }
      else if (taskType === 'javbus-movie') {
        endpoint = '/api/scheduler/download-sync/subscribe';
        body = {} as any;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`任务执行成功: ${result.message}`);
        setLastRun({
          taskType,
          timestamp: new Date().toLocaleString('zh-CN'),
          status: 'success',
          message: result.message,
        });
      } else {
        throw new Error(result.error || '任务执行失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast.error(`任务执行失败: ${errorMessage}`);
      setLastRun({
        taskType,
        timestamp: new Date().toLocaleString('zh-CN'),
        status: 'error',
        message: errorMessage,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <PageContainer scrollable={true} ><div className="space-y-6 w-full">
    <div>
      <h1 className="text-3xl font-bold tracking-tight">定时任务管理</h1>
      <p className="text-muted-foreground">
        管理系统的定时任务，包括每日同步和JAVBus订阅增量更新
      </p>
    </div>

    <div className="grid gap-6 md:grid-cols-3">
      {/* 每日同步任务 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            每日同步任务
          </CardTitle>
          <CardDescription>
            每天凌晨 2:00 (北京时间) 自动执行数据库同步操作
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">每日执行</Badge>
            <Badge variant="outline">凌晨 2:00</Badge>
          </div>
          <Button
            onClick={() => runTask('daily')}
            disabled={isRunning}
            className="w-full"
          >
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? '执行中...' : '立即执行'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Javbus 订阅影片更新
          </CardTitle>
          <CardDescription>
            每小时自动检查Javbus 订阅影片下载更新，发现新内容时推送通知
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">每小时执行</Badge>
            <Badge variant="outline">整点执行</Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>• 检查所有JAVBus订阅的新电影</p>
            <p>• 自动保存新发现的内容</p>
            <p>• 发送推送通知</p>
            <p>• 请求间添加延迟避免频率限制</p>
          </div>
          <Button
            onClick={() => runTask('javbus-movie')}
            disabled={isRunning}
            className="w-full"
          >
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? '执行中...' : '立即执行'}
          </Button>
        </CardContent>
      </Card>

      {/* JAVBus增量更新 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            JAVBus订阅增量更新
          </CardTitle>
          <CardDescription>
            每小时自动检查JAVBus订阅的新电影，发现新内容时推送通知
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">每小时执行</Badge>
            <Badge variant="outline">整点执行</Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>• 检查所有JAVBus订阅的新电影</p>
            <p>• 自动保存新发现的内容</p>
            <p>• 发送推送通知</p>
            <p>• 请求间添加延迟避免频率限制</p>
          </div>
          <Button
            onClick={() => runTask('javbus')}
            disabled={isRunning}
            className="w-full"
          >
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? '执行中...' : '立即执行'}
          </Button>
        </CardContent>
      </Card>

      {/* 下载状态同步 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            下载状态同步
          </CardTitle>
          <CardDescription>
            每5分钟自动同步下载器中的任务状态与数据库记录
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">每5分钟执行</Badge>
            <Badge variant="outline">自动同步</Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>• 查询下载器中的所有种子</p>
            <p>• 通过磁力哈希匹配数据库记录</p>
            <p>• 更新下载状态（downloading/downloaded等）</p>
            <p>• 发送状态变更通知</p>
          </div>
          <Button
            onClick={() => runTask('download-sync')}
            disabled={isRunning}
            className="w-full"
          >
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? '执行中...' : '立即执行'}
          </Button>
        </CardContent>
      </Card>
    </div>

    {/* 上次执行结果 */}
    {lastRun && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {lastRun.status === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            上次执行结果
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">任务类型:</span>
              <Badge variant="outline">
                {lastRun.taskType === 'daily' ? '每日同步任务' : 
                 lastRun.taskType === 'javbus' ? 'JAVBus增量更新' : 
                 '下载状态同步'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">执行时间:</span>
              <span className="text-muted-foreground">{lastRun.timestamp}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">状态:</span>
              <Badge variant={lastRun.status === 'success' ? 'default' : 'destructive'}>
                {lastRun.status === 'success' ? '成功' : '失败'}
              </Badge>
            </div>
            {lastRun.message && (
              <div className="flex items-start gap-2">
                <span className="font-medium">消息:</span>
                <span className="text-muted-foreground">{lastRun.message}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )}

    {/* 定时任务说明 */}
    <Card>
      <CardHeader>
        <CardTitle>定时任务说明</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-medium">每日同步任务</h4>
          <p className="text-sm text-muted-foreground">
            执行系统维护和数据库同步操作，确保数据一致性。
          </p>
        </div>
        <div className="space-y-2">
          <h4 className="font-medium">JAVBus订阅增量更新</h4>
          <p className="text-sm text-muted-foreground">
            自动检查所有JAVBus订阅的新电影，采用增量更新策略：
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>每个订阅最多检查5页内容</li>
            <li>页面间延迟3秒，订阅间延迟10秒</li>
            <li>发现新电影时自动保存并发送推送通知</li>
            <li>支持错误恢复，单个订阅失败不影响其他订阅</li>
          </ul>
        </div>
        <div className="space-y-2">
          <h4 className="font-medium">下载状态同步</h4>
          <p className="text-sm text-muted-foreground">
            自动同步下载器中的任务状态与数据库记录：
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>使用磁力哈希进行精确匹配</li>
            <li>支持多种下载状态：downloading、downloaded、paused、error等</li>
            <li>自动检测已完成的任务并更新状态</li>
            <li>发送状态变更推送通知</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  </div></PageContainer>
  );
}
