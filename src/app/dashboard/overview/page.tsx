import { MetricsSection } from "@/components/dashboard/overview-client";
import { SystemOverviewWrapper } from "@/components/dashboard/system-overview-wrapper";
import { RecentlyAddedWrapper } from "@/components/dashboard/recently-added";
import { TasksWidget } from "@/components/dashboard/tasks-widget";
import { StorageWidget } from "@/components/dashboard/storage";
import { getStorageInfo } from "@/lib/disk";
import { DOCKER_MOUNT_PATH } from "@/constants/data";
import { DayMovie } from "@/components/dashboard/day-movie";
import { prisma } from "@/lib/prisma";
import { MovieStatus, Prisma } from "@prisma/client";

export const metadata = {
  title: '仪表盘'
};

export const dynamic = 'force-dynamic';

async function getDayMovie() {
  const where = {
    status: MovieStatus.added,
    AND: [
      { detail: { not: Prisma.DbNull } },
      { detail: { not: Prisma.JsonNull } },
      { mediaLibrary: { not: Prisma.DbNull } },
      { mediaLibrary: { not: Prisma.JsonNull } }
    ]
  };
  const count = await prisma.movie.count({ where });

  if (count === 0) {
    return null;
  }

  const skip = Math.floor(Math.random() * count);
  const movie = await prisma.movie.findFirst({
    where,
    select: {
      id: true,
      number: true,
      title: true,
      cover: true,
      detail: true,
      mediaLibrary: true
    },
    skip,
    orderBy: {
      createdAt: 'desc'
    }
  });

  return movie
    ? {
        id: movie.id,
        number: movie.number,
        title: movie.title,
        cover: movie.cover,
        detail: movie.detail,
        mediaLibrary: movie.mediaLibrary
      }
    : null;
}

export default async function DashboardPage() {
  const [storageInfo, dayMovie] = await Promise.all([
    getStorageInfo(DOCKER_MOUNT_PATH),
    getDayMovie()
  ]);

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
            <DayMovie movie={dayMovie} />
            {/* <TasksWidget  /> */}
          </div>
        </div>

      </main>
    </div>
  );
}
