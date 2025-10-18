import { Film, Tv,Download, Clapperboard, Users, Rss } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface MediaStatisticsProps {
  subscribeCount: number;
  downloadingCount: number;
  subscribeListCount: number;
  addedCount: number;
}

export function MediaStatistics({ subscribeCount, downloadingCount, subscribeListCount, addedCount }: MediaStatisticsProps) {
  const stats = [
    { title: "订阅中影片", value: subscribeCount, icon: Film, color: "bg-purple-500" },
    { title: "已添加影片", value: addedCount, icon: Clapperboard, color: "bg-yellow-500" },
    { title: "下载中任务", value: downloadingCount, icon: Download, color: "bg-green-500" },
    { title: "订阅源", value: subscribeListCount, icon: Rss, color: "bg-blue-500" },
  ];

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">媒体统计</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center space-x-4">
            <div className={`p-3 rounded-lg ${stat.color}`}>
              <stat.icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{stat.title}</p>
              <p className="text-lg font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}