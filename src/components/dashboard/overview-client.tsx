"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  LayoutGrid,
  Router,
  TrendingDown,
  TrendingUp,
  ArrowDown,
} from "lucide-react";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSystemMetrics } from "@/hooks/use-system-metrics";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

interface MetricData {
  title: string;
  value: string;
  unit: string;
  subValue: string;
  trend: "up" | "down" | "neutral";
  trendValue: string;
  icon: React.ElementType;
  chartColor: string;
  chartData: Array<{ value: number }>;
}

const MetricCard = ({ data }: { data: MetricData }) => {
  const Icon = data.icon;
  const isTrendUp = data.trend === "up";
  const isTrendDown = data.trend === "down";

  // Convert Tailwind color class to hex color
  const getColorHex = (colorClass: string) => {
    const colorMap: Record<string, string> = {
      'text-sky-500': '#0ea5e9',
      'text-purple-500': '#a855f7',
      'text-emerald-500': '#10b981',
    };
    return colorMap[colorClass] || '#0ea5e9';
  };

  const colorHex = getColorHex(data.chartColor);

  // Check if this is the network card and if it has actual data
  const hasValidData = data.chartData.some(point => point.value > 0);
  const showChart = data.chartData.length > 1 && (data.title !== "下载器" || hasValidData);

  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-md py-0">
      {/* Dynamic Chart using recharts - Line only, no fill */}
      <div className="absolute right-0 bottom-0 h-16 w-32 opacity-40 pointer-events-none">
        {showChart && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <Area
                type="monotone"
                dataKey="value"
                stroke={colorHex}
                fill="transparent"
                strokeWidth={2}
                isAnimationActive={true}
                animationDuration={300}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <CardContent className="p-6 relative z-10 flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            {data.title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold tabular-nums">
              {data.value}
              <span className="text-sm font-normal text-muted-foreground ml-0.5">
                {data.unit}
              </span>
            </h3>
            <Badge
              variant="outline"
              className={`text-[10px] px-1 py-0 h-5 gap-0.5 border-transparent ${isTrendDown ? "bg-emerald-50 text-emerald-600" :
                  isTrendUp ? "bg-amber-50 text-amber-600" : "bg-slate-50"
                }`}
            >
              {isTrendDown && <TrendingDown size={10} />}
              {isTrendUp && <TrendingUp size={10} />}
              {data.trend === "neutral" && <ArrowDown size={10} />}
              {data.trendValue}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2 font-mono">
            {data.subValue}
          </p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-muted/50 ${data.chartColor.replace('text-', 'bg-').replace('500', '100')}`}>
          <Icon className={`h-5 w-5 ${data.chartColor}`} />
        </div>
      </CardContent>
    </Card>
  );
};

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function MetricsSection() {
  const { metrics, isConnected } = useSystemMetrics();

  // Initialize with some placeholder data points for smooth animation
  const [cpuHistory, setCpuHistory] = useState<Array<{ value: number }>>(() =>
    Array(10).fill(0).map(() => ({ value: 0 }))
  );
  const [memoryHistory, setMemoryHistory] = useState<Array<{ value: number }>>(() =>
    Array(10).fill(0).map(() => ({ value: 0 }))
  );
  const [networkHistory, setNetworkHistory] = useState<Array<{ value: number }>>(() =>
    Array(10).fill(0).map(() => ({ value: 0 }))
  );

  // Store previous metrics for trend calculation
  const [prevMetrics, setPrevMetrics] = useState<typeof metrics>(null);

  // Update history when metrics change
  useEffect(() => {
    if (metrics) {
      setCpuHistory(prev => {
        const newHistory = [...prev, { value: metrics.cpu.usage }];
        return newHistory.slice(-20); // Keep last 20 data points
      });

      setMemoryHistory(prev => {
        const newHistory = [...prev, { value: metrics.memory.usagePercent }];
        return newHistory.slice(-20);
      });

      setNetworkHistory(prev => {
        const downloadSpeedMB = metrics.network.downloadSpeed / 1024 / 1024;
        const newHistory = [...prev, { value: downloadSpeedMB }];
        return newHistory.slice(-20);
      });

      // Update previous metrics after processing
      setPrevMetrics(metrics);
    }
  }, [metrics]);

  // Calculate trend based on comparison with previous value
  const getCpuTrend = (): { trend: "up" | "down" | "neutral"; value: string } => {
    if (!metrics || !prevMetrics) return { trend: "neutral", value: "—" };
    const diff = metrics.cpu.usage - prevMetrics.cpu.usage;
    if (Math.abs(diff) < 0.1) return { trend: "neutral", value: "0%" };
    return {
      trend: diff > 0 ? "up" : "down",
      value: `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`
    };
  };

  const getMemoryTrend = (): { trend: "up" | "down" | "neutral"; value: string } => {
    if (!metrics || !prevMetrics) return { trend: "neutral", value: "—" };
    const diff = metrics.memory.usagePercent - prevMetrics.memory.usagePercent;
    if (Math.abs(diff) < 0.1) return { trend: "neutral", value: "0%" };
    return {
      trend: diff > 0 ? "up" : "down",
      value: `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`
    };
  };

  const getNetworkTrend = (): { trend: "up" | "down" | "neutral"; value: string } => {
    if (!metrics || !prevMetrics || !metrics.network.configured) {
      return { trend: "neutral", value: "—" };
    }
    const diff = metrics.network.downloadSpeed - prevMetrics.network.downloadSpeed;
    const diffMB = diff / 1024 / 1024;
    if (Math.abs(diffMB) < 0.01) return { trend: "neutral", value: "0 MB/s" };
    return {
      trend: diff > 0 ? "up" : "down",
      value: `${diff > 0 ? '+' : ''}${diffMB.toFixed(2)} MB/s`
    };
  };

  const cpuTrend = getCpuTrend();
  const memoryTrend = getMemoryTrend();
  const networkTrend = getNetworkTrend();

  const metricsData: MetricData[] = metrics ? [
    {
      title: "CPU",
      value: metrics.cpu.usage.toFixed(1),
      unit: "%",
      subValue: metrics.cpu.model,
      trend: cpuTrend.trend,
      trendValue: cpuTrend.value,
      icon: Cpu,
      chartColor: "text-sky-500",
      chartData: cpuHistory,
    },
    {
      title: "内存",
      value: formatBytes(metrics.memory.used).split(' ')[0],
      unit: formatBytes(metrics.memory.used).split(' ')[1],
      subValue: `${formatBytes(metrics.memory.total)} Total`,
      trend: memoryTrend.trend,
      trendValue: memoryTrend.value,
      icon: LayoutGrid,
      chartColor: "text-purple-500",
      chartData: memoryHistory,
    },
    {
      title: "下载器",
      value: metrics.network.configured
        ? (metrics.network.downloadSpeed / 1024 / 1024).toFixed(1)
        : "—",
      unit: metrics.network.configured ? "MB/s" : "",
      subValue: metrics.network.configured
        ? `↓ ${formatBytes(metrics.network.downloadSpeed)}/s | ↑ ${formatBytes(metrics.network.uploadSpeed)}/s`
        : "下载器未配置",
      trend: metrics.network.configured ? networkTrend.trend : "neutral",
      trendValue: metrics.network.configured ? networkTrend.value : "未配置",
      icon: Router,
      chartColor: "text-emerald-500",
      chartData: networkHistory,
    },
  ] : [];

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {metricsData.length > 0 ? (
        metricsData.map((metric) => (
          <MetricCard key={metric.title} data={metric} />
        ))
      ) : (
        // Loading state
        Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))
      )}
    </section>
  );
}
