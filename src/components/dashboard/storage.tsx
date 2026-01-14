"use client"


import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { HardDrive } from "lucide-react";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import { StorageInfo } from "@/lib/disk";
import { Progress } from "../ui/progress";

export const StorageWidget = ({ storageInfo }: { storageInfo: StorageInfo }) => {
  const router = useRouter();

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <HardDrive size={18} />
          <span className="text-xs font-bold tracking-widest uppercase">存储空间</span>
        </div>
        <CardTitle>存储池</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col items-center justify-center pt-0">
        <div className="w-full space-y-3">
          <div className="flex items-baseline justify-between w-full">
            <div>
              <span className="text-xl font-bold">{storageInfo.used}</span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">of {storageInfo.total}</span>
          </div>
          
          <Progress value={storageInfo.percentage} className="h-2" />
          <Button variant="outline" className="w-full mt-2" size="sm" onClick={() => router.push("/dashboard/file/manager")}>文件管理</Button>
        </div>
      </CardContent>
    </Card>
  );
};
