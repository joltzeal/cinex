import PageContainer from '@/components/layout/page-container';
import LibraryPage from './library';
import { getSubscribeMovieList } from '@/services/subscribe';

export default async function CatalogPage() {
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
  return <PageContainer scrollable={true}>
    <LibraryPage subscribeMovieList={libraryMovieList} key={'library'} />  </PageContainer>
}