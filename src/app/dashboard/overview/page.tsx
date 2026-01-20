import { MetricsSection } from "@/components/dashboard/overview-client";
import { SystemOverviewWrapper } from "@/components/dashboard/system-overview-wrapper";
import { RecentlyAddedWrapper } from "@/components/dashboard/recently-added";
import { TasksWidget } from "@/components/dashboard/tasks-widget";
import { StorageWidget } from "@/components/dashboard/storage";
import { getStorageInfo } from "@/lib/disk";
import { DOCKER_MOUNT_PATH } from "@/constants/data";

export const metadata = {
  title: '仪表盘'
};

export default async function DashboardPage() {
  const storageInfo = await getStorageInfo(DOCKER_MOUNT_PATH);

  return (
    <div>
      <main className="">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12">
            {/* Section: Metrics */}
            <MetricsSection />
          </div>
          <div className="col-span-8">
            <SystemOverviewWrapper />
          </div>
          <div className="col-span-4">
            <StorageWidget storageInfo={storageInfo} />
          </div>
          <div className="col-span-8">
             <RecentlyAddedWrapper />
          </div>
          <div className="col-span-4">
            <TasksWidget  />
          </div>
        </div>

      </main>
    </div>
  );
}
