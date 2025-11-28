
import PageContainer from '@/components/layout/page-container';
import { SearchComponent } from '@/components/search-command-dialog';
import { StorageSpace } from '@/features/overview/components/storage-space';
import { MediaStatistics } from '@/features/overview/components/media-statistics';
import { RealtimeSpeedCard } from '@/features/overview/components/realtime-speed-card';
import { BackgroundTasksCard } from '@/features/overview/components/background-tasks-card';
import { RecentlyAddedCard } from '@/features/overview/components/recently-added-card';
import { CpuUsageCard, MemoryUsageCard } from '@/features/overview/components/resource-usage-card';
import { SystemStatsProvider } from '@/components/providers/system-stats-provider';
import { getSubscribeListCount, getSubscribeMovieCount, getWeeklyAddedMovieData } from '@/services/subscribe';
import { getDocumentDownloadCount } from '@/services/download';
import { MovieStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { RandomMovie } from '@/features/overview/components/random-movie';
import { cn } from '@/lib/utils';


export default async function OverviewPage() {
  const recentlyAddedData = await getWeeklyAddedMovieData();
  const subscribeCount = await getSubscribeMovieCount(MovieStatus.subscribed);
  const downloadingCount = await getDocumentDownloadCount(MovieStatus.downloading);
  const addedCount = await getSubscribeMovieCount(MovieStatus.added);
  const subscribeListCount = await getSubscribeListCount();

  
  const addedMovies = await db.movie.findMany({
    where: {
      status: MovieStatus.added,
      cover:{
        not: null
      },
      
    }
  })


  return (
    <SystemStatsProvider>
      <PageContainer>

        <div className="flex flex-1 flex-col space-y-6 ">
          <div className="mt-8 flex justify-center">
            <SearchComponent />
          </div>
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
            <div >
              <StorageSpace />
            </div>
            <div className="lg:col-span-2">
              <MediaStatistics subscribeCount={subscribeCount} downloadingCount={downloadingCount} subscribeListCount={subscribeListCount} addedCount={addedCount} />
            </div>
          </div>
          <div className={cn("grid gap-4 grid-cols-1", addedMovies ? 'grid-cols-4' : 'grid-cols-3')}>

            <RecentlyAddedCard recentlyAddedData={recentlyAddedData} />
            <RealtimeSpeedCard />
            <BackgroundTasksCard />
            {addedMovies && <RandomMovie movies={addedMovies} />}
            
          </div>
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <CpuUsageCard />
              <MemoryUsageCard />
            </div>

        </div>

      </PageContainer>
    </SystemStatsProvider>
  );
}
