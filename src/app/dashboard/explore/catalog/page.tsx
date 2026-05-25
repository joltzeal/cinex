import PageContainer from '@/components/layout/page-container';
import LibraryPage from './library';
import {
  getCatalogMovieCount,
  getCatalogMovieFilterOptions,
  getCatalogMovieList
} from '@/services/subscribe';

const PAGE_SIZE = 100;

export default async function CatalogPage() {
  const [libraryMovieList, total, filterOptions] = await Promise.all([
    getCatalogMovieList({
      take: PAGE_SIZE + 1
    }),
    getCatalogMovieCount(),
    getCatalogMovieFilterOptions()
  ]);
  const hasMore = libraryMovieList.length > PAGE_SIZE;

  return (
    <PageContainer scrollable={true}>
      <LibraryPage
        subscribeMovieList={libraryMovieList.slice(0, PAGE_SIZE)}
        initialHasMore={hasMore}
        initialTotal={total}
        filterOptions={filterOptions}
        pageSize={PAGE_SIZE}
        key={'library'}
      />
    </PageContainer>
  );
}
