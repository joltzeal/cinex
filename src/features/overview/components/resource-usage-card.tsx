"use client";

import { useState, useEffect } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSystemStats } from "@/components/providers/system-stats-provider";

// 通用的图表组件，因为它内部的状态管理逻辑是相同的
function UsageChart({ title, unit, currentValue }: { title: string; unit: string; currentValue: number | null }) {
  const [data, setData] = useState<{ value: number }[]>([]);

  useEffect(() => {
    if (currentValue !== null) {
      // 将新数据点添加到历史记录中用于绘制图表
      setData((prevData) => {
        const newData = [...prevData, { value: currentValue }];
        // 只保留最近的 20 个数据点
        return newData.length > 20 ? newData.slice(1) : newData;
      });
    }
  }, [currentValue]);

  // 加载状态
  if (currentValue === null) {
    return (
      <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent>
          <Skeleton className="h-[120px] w-full" />
        </CardContent>
        <CardFooter>
          <Skeleton className="h-4 w-24" />
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <Tooltip
              contentStyle={{ background: "black", border: "none" }}
              labelStyle={{ display: "none" }}
              formatter={(value: number) => [`${value.toFixed(2)} ${unit}`, null]}
            />
            <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />
            <Line type="monotone" strokeWidth={2} dataKey="value" stroke="#8884d8" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          当前: {currentValue.toFixed(2)} {unit}
        </div>
      </CardFooter>
    </Card>
  );
}

// 具体的 CPU 卡片，从 Context 获取数据
export function CpuUsageCard() {
  const stats = useSystemStats();
  return <UsageChart title="CPU" unit="%" currentValue={stats?.cpu ?? null} />;
}

// 具体的内存卡片，从 Context 获取数据
export function MemoryUsageCard() {
  const stats = useSystemStats();
  
  // 注意，我们这里使用百分比来绘制图表，但显示的是 MB
  const currentValuePercent = stats?.memory.usedPercent ?? null;
  const currentValueMB = stats?.memory.used ?? '...';

  const [data, setData] = useState<{ value: number }[]>([]);

  useEffect(() => {
    
    if (currentValuePercent !== null) {
      setData((prevData) => {
        const newData = [...prevData, { value: currentValuePercent }];
        return newData.length > 20 ? newData.slice(1) : newData;
      });
    }
  }, [currentValuePercent]);

  if (stats === null) {
    // ... Loading Skeleton ...
    return <Card><CardHeader><CardTitle>内存</CardTitle></CardHeader><CardContent><Skeleton className="h-[120px] w-full" /></CardContent><CardFooter><Skeleton className="h-4 w-24" /></CardFooter></Card>
  }

  // 为内存卡片定制化，因为显示的单位和图表单位不同
  return (
    <Card>
      <CardHeader><CardTitle>内存</CardTitle></CardHeader>
      <CardContent className="h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <Tooltip
              contentStyle={{ background: "black", border: "none" }}
              labelStyle={{ display: "none" }}
              formatter={(value: number) => [`${value.toFixed(2)} %`, null]}
            />
            <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />
            <Line type="monotone" strokeWidth={2} dataKey="value" stroke="#8884d8" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          当前: {currentValueMB} MB ({currentValuePercent?.toFixed(2)}%)
        </div>
      </CardFooter>
    </Card>
  )
}