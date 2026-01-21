import SubscribeDialog from '@/features/subscribe/subscribe-dialog';
import { SubscribeFilter } from '@/features/subscribe/subscribe-filter';
import JavbusSubscribeInfoItem from '@/features/subscribe/subscribe-item';
import { SubscribeKeywordSearch } from '@/features/subscribe/subscribe-keyword-search';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty';
import { Heading } from '@/components/ui/heading';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';
import { Separator } from '@/components/ui/separator';
import { logger } from '@/lib/logger';
import { searchParamsCache } from '@/lib/searchparams';
import { getSetting, SettingKey } from '@/services/settings';
import {
  getSubscribeListCount,
  getSubscribeListWithMovies
} from '@/services/subscribe';
import { IconFolderCode } from '@tabler/icons-react';
import { SearchParams } from 'nuqs/server';
const filterTypeMap = {
  genre: '类别',
  director: '导演',
  studio: '制作商',
  label: '发行商',
  series: '系列',
  star: '演员'
};

export const metadata = {
  title: '订阅源'
};
type pageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function Page(props: pageProps) {
  const searchParams = await props.searchParams;
  // Allow nested RSCs to access the search params (in a type-safe way)
  searchParamsCache.parse(searchParams);
  const page = searchParamsCache.get('page');
  const search = searchParamsCache.get('search');
  const pageLimit = searchParamsCache.get('perPage');
  const filterType = searchParamsCache.get('filterType');

  // 构建查询条件
  const whereClause: any = {};

  if (search) {
    whereClause.search = search;
  }

  if (filterType && filterType !== 'all') {
    whereClause.filterType = filterType;
  }

  // 计算分页参数
  const offset = (page - 1) * pageLimit;

  // 获取总数
  const totalCount = await getSubscribeListCount(whereClause);

  // 计算总页数
  const totalPages = Math.ceil(totalCount / pageLimit);
  const subscribeList = (await getSubscribeListWithMovies(
    whereClause,
    offset,
    pageLimit
  )) as any[];


  return (
    <PageContainer scrollable={true}>
      <div className='flex flex-1 flex-col space-y-4'>
        <div className='flex flex-col gap-4'>
          <div className='flex flex-col items-start justify-between gap-2 sm:flex-row'>
            <Heading title='订阅源' description='自定义 Javbus 订阅源' />
            <div className='flex items-center gap-2'>
              <SubscribeFilter />
              <SubscribeKeywordSearch />

              <SubscribeDialog />
            </div>
          </div>
        </div>
        <Separator />

        {/* 显示筛选状态和分页信息 */}
        <div className='text-muted-foreground flex items-center justify-between text-sm'>
          <div className='flex items-center gap-4'>
            {filterType && filterType !== 'all' && (
              <div className='flex items-center gap-2'>
                <span>筛选类型:</span>
                <span className='font-medium'>
                  {filterTypeMap[filterType as keyof typeof filterTypeMap] ||
                    filterType}
                </span>
              </div>
            )}
            {search && (
              <div className='flex items-center gap-2'>
                <span>搜索关键字:</span>
                <span className='font-medium'>{search}</span>
              </div>
            )}
          </div>
          <div className='flex items-center gap-2'>
            <span>共 {totalCount} 个订阅</span>
            {totalPages > 1 && (
              <span>
                第 {page} / {totalPages} 页
              </span>
            )}
          </div>
        </div>

        {subscribeList.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant='icon'>
                <IconFolderCode />
              </EmptyMedia>
              <EmptyTitle>没有订阅</EmptyTitle>
              <EmptyDescription>
                你还没有创建任何订阅。请点击添加订阅按钮创建你的第一个订阅。
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div className='flex gap-2'>
                <SubscribeDialog />
              </div>
            </EmptyContent>
          </Empty>
        )}

        <div className='w-full max-w-full flex-1 space-y-4'>
          {subscribeList.map((item) => (
            <JavbusSubscribeInfoItem key={item.id} info={item} />
          ))}
        </div>

        {/* 分页组件 */}
        {totalPages > 1 && (
          <div className='mt-6 flex justify-center'>
            <Pagination>
              <PaginationContent>
                {/* 上一页 */}
                {page > 1 && (
                  <PaginationItem>
                    <PaginationPrevious
                      href={`?${new URLSearchParams({
                        page: (page - 1).toString(),
                        perPage: pageLimit.toString(),
                        ...(filterType && filterType !== 'all'
                          ? { filterType }
                          : {}),
                        ...(search ? { search } : {})
                      }).toString()}`}
                    />
                  </PaginationItem>
                )}

                {/* 页码 */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (page <= 3) {
                    pageNumber = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = page - 2 + i;
                  }

                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        href={`?${new URLSearchParams({
                          page: pageNumber.toString(),
                          perPage: pageLimit.toString(),
                          ...(filterType && filterType !== 'all'
                            ? { filterType }
                            : {}),
                          ...(search ? { search } : {})
                        }).toString()}`}
                        isActive={pageNumber === page}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                {/* 省略号和最后一页 */}
                {totalPages > 5 && page < totalPages - 2 && (
                  <>
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink
                        href={`?${new URLSearchParams({
                          page: totalPages.toString(),
                          perPage: pageLimit.toString(),
                          ...(filterType && filterType !== 'all'
                            ? { filterType }
                            : {}),
                          ...(search ? { search } : {})
                        }).toString()}`}
                      >
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  </>
                )}

                {/* 下一页 */}
                {page < totalPages && (
                  <PaginationItem>
                    <PaginationNext
                      href={`?${new URLSearchParams({
                        page: (page + 1).toString(),
                        perPage: pageLimit.toString(),
                        ...(filterType && filterType !== 'all'
                          ? { filterType }
                          : {}),
                        ...(search ? { search } : {})
                      }).toString()}`}
                    />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
