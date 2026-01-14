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
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex flex-col gap-6">
          {/* Section: Metrics */}
          <MetricsSection />

          {/* Section: Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <SystemOverviewWrapper />
              <RecentlyAddedWrapper />
            </div>

            {/* Right Column (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <StorageWidget storageInfo={storageInfo} />
              <TasksWidget  />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
