import PageContainer from '@/components/layout/page-container';
import { Heading } from '@/components/ui/heading';
import { searchParamsCache } from '@/lib/searchparams';
import { SearchParams } from 'nuqs';
import SubscribePosterWallPage from './poster-wall';
import { getSubscribeMovieList } from '@/services/subscribe';
import { Movie, MovieStatus } from '@prisma/client';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty';
import { Film } from 'lucide-react';

type pageProps = {
  searchParams: Promise<SearchParams>;
};
export const metadata = {
  title: '影片'
};
async function uniqueMovieList(movieList: Movie[]) {
  return Array.from(
    new Map(movieList.map((item) => [item.number, item])).values()
  );
}

export default async function Page(props: pageProps) {
  const searchParams = await props.searchParams;
  searchParamsCache.parse(searchParams);
  const page = searchParamsCache.get('page');
  const pageLimit = searchParamsCache.get('perPage');
  const filterType = searchParamsCache.get('filterType');
  const subscribedMovieList = await getSubscribeMovieList({
    where: {
      status: MovieStatus.subscribed
    }
  });



  const donwloadingMovieList = await getSubscribeMovieList({
    where: {
      status: MovieStatus.downloading
    }
  });
  
  const downloadMovieList = await getSubscribeMovieList({
    where: {
      status: MovieStatus.downloaded
    }
  });

  const addedMovieList = await getSubscribeMovieList({
    where: {
      addedAt: {
        not: null
      }
    },
    orderBy: {
      addedAt: 'desc'
    }
  });

  const libraryMovieList = await getSubscribeMovieList({
    // where: {
    //   status: {
    //     notIn: [MovieStatus.uncheck]
    //   }
    // },
    orderBy: {
      date: 'desc'
    }
  });

  const hasAnyMovies =
    subscribedMovieList.length > 0 ||
    donwloadingMovieList.length > 0 ||
    addedMovieList.length > 0;

  return (
    <PageContainer scrollable={true}>
      <div className='w-full space-y-8'>
        {!hasAnyMovies && (
          <Empty className='bg-muted/30 min-h-100 border'>
            <EmptyHeader>
              <EmptyMedia variant='icon'>
                <Film />
              </EmptyMedia>
              <EmptyTitle>暂无影片</EmptyTitle>
              <EmptyDescription>
                当前还没有订阅中、下载中或已添加到媒体库的影片。
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {subscribedMovieList?.length > 0 && (
          <div className='space-y-4'>
            <Heading
              title={'订阅中影片'}
              description={`共订阅 ${subscribedMovieList.length} 部影片`}
            />
            <SubscribePosterWallPage
              subscribeMovieList={subscribedMovieList}
              status='subscribed'
              key={'subscribed'}
            />
          </div>
        )}

        {donwloadingMovieList?.length > 0 && (
          <div className='space-y-4'>
            <Heading
              title={'下载中影片'}
              description={`正在下载 ${donwloadingMovieList.length} 部影片`}
            />
            <SubscribePosterWallPage
              subscribeMovieList={donwloadingMovieList}
              status='downloading'
              key={'downloading'}
            />
          </div>
        )}
        {addedMovieList?.length > 0 && (
          <div className='space-y-4'>
            <Heading
              title={'最近添加影片'}
              description={`最近添加媒体库的影片`}
            />
            <SubscribePosterWallPage
              subscribeMovieList={addedMovieList}
              status='added'
              key={'added'}
            />
          </div>
        )}
      </div>
    </PageContainer>
  );
}
