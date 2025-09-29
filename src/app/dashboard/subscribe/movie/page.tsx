import PageContainer from "@/components/layout/page-container";
import { Heading } from "@/components/ui/heading";
import { db } from "@/lib/db";
import { searchParamsCache } from "@/lib/searchparams";
import { SearchParams } from "nuqs";
import SubscribePosterWallPage from "./poster-wall";

type pageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function Page(props: pageProps) {
  const searchParams = await props.searchParams;
  searchParamsCache.parse(searchParams);
  const page = searchParamsCache.get('page');
  const pageLimit = searchParamsCache.get('perPage');
  const filterType = searchParamsCache.get('filterType');
  const subscribeMovieList = await db.subscribeData.findMany({
    where: {
      status: 'subscribed'
    }
  });
  const downloadMovieList = await db.subscribeData.findMany({
    where: {
      status: 'downloaded'
    }
  });
  const donwloadingMovieList = await db.subscribeData.findMany({
    where: {
      status: 'downloading'
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });
  const addedMovieList = await db.subscribeData.findMany({
    where: {
      status: 'added'
      
    }
  });
  const mediaServerConfig = await db.setting.findUnique({
    where: {
      key: 'mediaServerConfig'
    }
  });
  const mediaServer = mediaServerConfig?.value as any;
  
  return (
    <PageContainer scrollable={true}>
      <div className="space-y-8">
        {subscribeMovieList?.length > 0 && (
          <div className="space-y-4">
            <Heading title={"订阅中影片"} description={`共订阅 ${subscribeMovieList.length} 部影片`} />
            <SubscribePosterWallPage subscribeMovieList={subscribeMovieList} status="subscribed" key={"subscribed"} />
          </div>
        )}

        {donwloadingMovieList?.length > 0 && (
          <div className="space-y-4">
            <Heading title={"下载中影片"} description={`正在下载 ${donwloadingMovieList.length} 部影片`} />
            <SubscribePosterWallPage subscribeMovieList={donwloadingMovieList} status="downloading" key={"downloading"} />
          </div>
        )}

        {downloadMovieList?.length > 0 && (
          <div className="space-y-4">
            <Heading title={"已下载影片"} description={`已完成 ${downloadMovieList.length} 部影片`} />
            <SubscribePosterWallPage subscribeMovieList={downloadMovieList} status="downloaded" key={"downloaded"} />
          </div>
        )}
        {/* {addedMovieList?.length > 0 && (
          <div className="space-y-4">
            <Heading title={"已添加媒体库影片"} description={`已添加媒体库影片`} />
            <SubscribePosterWallPage subscribeMovieList={addedMovieList} status="added" key={"added"} mediaServer={mediaServer} />
          </div>
        )} */}

        {subscribeMovieList?.length === 0 && donwloadingMovieList?.length === 0 && downloadMovieList?.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <p>暂无订阅的影片</p>
          </div>
        )}
      </div>
    </PageContainer>
  )
}