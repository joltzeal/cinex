import { MetricsSection } from "@/components/dashboard/overview-client";
import { SystemOverviewWrapper } from "@/components/dashboard/system-overview-wrapper";
import { RecentlyAddedWrapper } from "@/components/dashboard/recently-added";
import { TasksWidget } from "@/components/dashboard/tasks-widget";
import { StorageData, StorageWidget } from "@/components/dashboard/storage";


const MOCK_STORAGE: StorageData = {
  poolName: "Drive Pool A",
  temperature: 32,
  usedSpace: 2.8,
  totalSpace: 4.0,
  percentUsed: 70,
};

export default function DashboardPage() {
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
              <StorageWidget data={MOCK_STORAGE} />
              <TasksWidget  />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
