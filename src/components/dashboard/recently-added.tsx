import { getRecentlyAddedMovies } from "@/services/subscribe";
import { MediaGrid } from "./recently-add-client";

async function getRecentlyAdded() {


  const recentlyAddedData = await getRecentlyAddedMovies();
  return {
      recentlyAddedData
    }



}

export async function RecentlyAddedWrapper() {
  const { recentlyAddedData } = await getRecentlyAdded();

  return <MediaGrid movies={recentlyAddedData} title="最近添加" />;
}
