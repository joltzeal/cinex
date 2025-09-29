import PageContainer from '@/components/layout/page-container';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import JavbusSubscribeInfoItem from '@/components/JAV/subscribe-item';
import { SearchParams } from 'nuqs/server';
import { db } from '@/lib/db';
import { searchParamsCache } from '@/lib/searchparams';
import { SubscribeActions } from '@/components/JAV/subscribe-actions';
import { SubscribeFilter } from '@/components/JAV/subscribe-filter';
import SubscribeDialog from '@/components/JAV/subscribe-dialog';
import {EmptyState} from '@/components/empty-state';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { logger } from '@/lib/logger';

const filterTypeMap = {
  genre: '类别',
  director: '导演',
  studio: '制作商',
  label: '发行商',
  series: '系列',
  star: '演员'
};

export const metadata = {
  title: 'Subscribe: JAV'
};
type pageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function Page(props: pageProps) {
  const searchParams = await props.searchParams;
  // Allow nested RSCs to access the search params (in a type-safe way)
  searchParamsCache.parse(searchParams);
  const page = searchParamsCache.get('page');
  const pageLimit = searchParamsCache.get('perPage');
  const filterType = searchParamsCache.get('filterType');

  // 构建查询条件
  const whereClause: any = {};

  if (filterType && filterType !== 'all') {
    whereClause.filterType = filterType;
  }

  // 计算分页参数
  const offset = (page - 1) * pageLimit;
  
  // 获取总数
  const totalCount = await db.subscribeJAVBus.count({
    where: whereClause,
  });
  
  // 计算总页数
  const totalPages = Math.ceil(totalCount / pageLimit);
  
  const subscribeList = await db.subscribeJAVBus.findMany({
    where: whereClause,
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      movies: {
        orderBy: {
          date: 'desc', // 按 releaseDate 排序
        },
      },
    },
    skip: offset,
    take: pageLimit,
  });

  const mediaServerConfig = await db.setting.findUnique({where: {key: 'mediaServerConfig'}});
  const mediaServer = mediaServerConfig?.value as unknown as MediaServerConfig;
  logger.info(mediaServer);
  console.log(mediaServer);
  

  return (
    <PageContainer scrollable={true}>
      <div className='flex flex-1 flex-col space-y-4'>
        <div className='flex items-start justify-between'>
          <Heading
            title='订阅源'
            description='自定义 Javbus 订阅源'
          />
          <div className="flex items-center gap-2">
            <SubscribeFilter />
            <SubscribeActions />
            <SubscribeDialog />
          </div>
        </div>
        <Separator />

        {/* 显示筛选状态和分页信息 */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            {filterType && filterType !== 'all' && (
              <>
                <span>筛选类型:</span>
                <span className="font-medium">
                  {filterTypeMap[filterType as keyof typeof filterTypeMap] || filterType}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span>共 {totalCount} 个订阅</span>
            {totalPages > 1 && (
              <span>第 {page} / {totalPages} 页</span>
            )}
          </div>
        </div>

        {
          subscribeList.length === 0 && (
            <EmptyState
              title="没有订阅的数据源"
              message="点击右上角添加新订阅"
            />
          )
        }

        <div className="flex-1 space-y-4 max-w-full w-full">
          {
            subscribeList.map((item) => (
              <JavbusSubscribeInfoItem key={item.id} info={item} mediaServer={mediaServer}></JavbusSubscribeInfoItem >
            ))
          }
        </div>

        {/* 分页组件 */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination>
              <PaginationContent>
                {/* 上一页 */}
                {page > 1 && (
                  <PaginationItem>
                    <PaginationPrevious 
                      href={`?${new URLSearchParams({
                        page: (page - 1).toString(),
                        perPage: pageLimit.toString(),
                        ...(filterType && filterType !== 'all' ? { filterType } : {})
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
                          ...(filterType && filterType !== 'all' ? { filterType } : {})
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
                          ...(filterType && filterType !== 'all' ? { filterType } : {})
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
                        ...(filterType && filterType !== 'all' ? { filterType } : {})
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
