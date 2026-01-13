import { prisma } from "@/lib/prisma";
import { MovieStatus } from "@prisma/client";
import { SystemOverviewClient } from "./system-overview-client";
import { getSubscribeListCount, getSubscribeMovieCount, getWeeklyAddedMovieData } from "@/services/subscribe";
import { getDocumentDownloadCount } from "@/services/download";

async function getOverviewData() {



  const subscribeCount = await getSubscribeMovieCount(MovieStatus.subscribed);
  const downloadingCount = await getDocumentDownloadCount(MovieStatus.downloading);
  const addedCount = await getSubscribeMovieCount(MovieStatus.added);
  const subscribeListCount = await getSubscribeListCount();

  const addedMovies = await prisma.movie.findMany({
    where: {
      status: MovieStatus.added,
      cover: {
        not: null
      },

    }
  })

  return {
    subscribeCount,
    downloadingCount,
    addedCount,
    subscribeListCount
  };
}

export async function SystemOverviewWrapper() {
  const data = await getOverviewData();

  return <SystemOverviewClient data={data} />;
}
