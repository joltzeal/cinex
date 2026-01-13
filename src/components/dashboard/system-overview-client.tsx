"use client";

import {
  Activity,
  Download,
  Database,
  Film,
  MoreHorizontal
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SystemOverviewData {
  subscribeCount: number;
  downloadingCount: number;
  addedCount: number;
  subscribeListCount: number;
}

const stats = [
  {
    label: "已订阅影片",
    key: "subscribeCount" as keyof SystemOverviewData,
    icon: Activity,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    label: "已添加影片",
    key: "addedCount" as keyof SystemOverviewData,
    icon: Film,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    label: "下载中影片",
    key: "downloadingCount" as keyof SystemOverviewData,
    icon: Download,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    label: "订阅源",
    key: "subscribeListCount" as keyof SystemOverviewData,
    icon: Database,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
];

export function SystemOverviewClient({ data }: { data: SystemOverviewData }) {
  return (
    <Card className="gap-0 py-3 pb-0">
      <CardHeader className="flex flex-row items-center justify-between border-b [.border-b]:pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          数据预览
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="flex-1 flex items-center justify-between p-5 transition-colors group"
            >
              <div className="flex flex-col gap-1">
                <span className="text-[14px] font-bold uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </span>
                <span className="text-2xl font-bold leading-none text-foreground">
                  {data[stat.key]}
                </span>
              </div>

              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center transition-all group-hover:scale-110",
                stat.bg,
                stat.color
              )}>
                <stat.icon size={18} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
