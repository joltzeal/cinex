import PageContainer from '@/components/layout/page-container';
import LibraryPage from './library';
import { getSubscribeMovieList } from '@/services/subscribe';

const PAGE_SIZE = 100;

export default async function CatalogPage() {
  const libraryMovieList = await getSubscribeMovieList({
    // where: {
    //   status: {
    //     notIn: [MovieStatus.uncheck]
    //   }
    // },
    orderBy: {
      date: 'desc'
    },
    take: PAGE_SIZE + 1
  });
  const hasMore = libraryMovieList.length > PAGE_SIZE;

  return (
    <PageContainer scrollable={true}>
      <LibraryPage
        subscribeMovieList={libraryMovieList.slice(0, PAGE_SIZE)}
        initialHasMore={hasMore}
        pageSize={PAGE_SIZE}
        key={'library'}
      />
    </PageContainer>
  );
}
