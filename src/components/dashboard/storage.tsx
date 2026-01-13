"use client"

import { Progress } from "@radix-ui/react-progress";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { HardDrive } from "lucide-react";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
export interface StorageData {
  poolName: string;
  temperature: number;
  usedSpace: number;
  totalSpace: number;
  percentUsed: number;
}
export const StorageWidget = ({ data }: { data: StorageData }) => {
    const router = useRouter();
  const handleGoToFile = () => {
    // TODO: 跳转到文件管理页面
    router.push("/dashboard/file/manager");
  }
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <HardDrive size={18} />
          <span className="text-xs font-bold tracking-widest uppercase">存储空间</span>
        </div>
        <CardTitle>{data.poolName}</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col items-center justify-center pt-0">
        <div className="w-full space-y-3">
          <div className="flex items-baseline justify-between w-full">
            <div>
              <span className="text-xl font-bold">{data.usedSpace}</span>
              <span className="text-sm text-muted-foreground ml-1">TB</span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">of {data.totalSpace} TB</span>
          </div>
          <Progress value={data.percentUsed} className="h-2" />
          <Button variant="outline" className="w-full mt-2" size="sm" onClick={handleGoToFile}>文件管理</Button>
        </div>
      </CardContent>
    </Card>
  );
};
