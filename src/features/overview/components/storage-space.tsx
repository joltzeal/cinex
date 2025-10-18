import { HardDrive, Rocket } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getStorageInfo, StorageInfo } from "@/lib/disk";
import { DOCKER_MOUNT_PATH } from "@/constants/data";
import StorageProgress from "@/components/storage-progress";

export async function StorageSpace() {
  const storageInfo: StorageInfo = await getStorageInfo(DOCKER_MOUNT_PATH);
  console.log(storageInfo);
  
  console.log(storageInfo);
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">存储空间</CardTitle>
        <HardDrive className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{storageInfo.total}</div>
        <div className="flex items-center text-xs text-muted-foreground">
          <span>已使用 {storageInfo.percentage}%</span>
          <Rocket className="ml-1 h-4 w-4" />
        </div>
        <StorageProgress value={storageInfo.percentage} className="mt-2" />
      </CardContent>
    </Card>
  );
}