import { prisma } from '@/lib/prisma';
import { MovieStatus, Prisma, Subscribe, Movie } from '@prisma/client';
import dayjs from 'dayjs';
interface GetSubscribeMovieListParams {
  where?: Prisma.MovieWhereInput;
  orderBy?:
  | Prisma.MovieOrderByWithRelationInput
  | Prisma.MovieOrderByWithRelationInput[];
  skip?: number;
  take?: number;
}
interface UpdateMoviesStatusByNumberParams {
  number: string;
  status: MovieStatus;
}
interface UpdateMoviesDataByNumberParams {
  number: string;
  data: Prisma.MovieUpdateInput;
}
export async function updateMoviesStatusByNumber(
  params: UpdateMoviesStatusByNumberParams
) {
  const { number, status } = params;
  const movie = await prisma.movie.findUnique({
    where: { number: number }
  });
  if (movie) {
    await prisma.movie.update({
      where: { id: movie.id },
      data: { status: status }
    });
  }
}

export async function updateMoviesDataByNumber(
  params: UpdateMoviesDataByNumberParams
) {
  const { number, data } = params;
  await prisma.movie.update({
    where: { number: number },
    data: data
  });
}

export async function getSubscribeListWithMovies(
  whereClause: any,
  offset: number,
  pageLimit: number
): Promise<Subscribe[]> {
  // 构建 Prisma 查询条件
  const prismaWhere: Prisma.SubscribeWhereInput = {};

  // 处理 filterType 条件
  if (whereClause.filterType) {
    prismaWhere.filterType = whereClause.filterType;
  }

  // 处理 search 条件 - 搜索 filter.name
  if (whereClause.search) {
    prismaWhere.filter = {
      path: ['name'],
      string_contains: whereClause.search
    } as any;
  }

  return await prisma.subscribe.findMany({
    where: prismaWhere,
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      movies: {
        include: {
          movie: true // 包含实际的 Movie 数据
        },
        orderBy: {
          movie: {
            date: 'desc'
          }
        }
      }
    },
    skip: offset,
    take: pageLimit
  });
}
export async function getSubscribeListCount(
  whereClause?: any
): Promise<number> {
  // 构建 Prisma 查询条件
  const prismaWhere: Prisma.SubscribeWhereInput = {};

  if (whereClause) {
    // 处理 filterType 条件
    if (whereClause.filterType) {
      prismaWhere.filterType = whereClause.filterType;
    }

    // 处理 search 条件 - 搜索 filter.name
    if (whereClause.search) {
      prismaWhere.filter = {
        path: ['name'],
        string_contains: whereClause.search
      } as any;
    }
  }

  return await prisma.subscribe.count({
    where: prismaWhere
  });
}

export async function getSubscribeMovieCount(
  status: MovieStatus
): Promise<number> {
  return await prisma.movie.count({
    where: {
      status: status
    }
  });
}
/**
 * 获取订阅电影列表的异步函数
 * @param params - 获取订阅电影列表的参数对象
 * @returns 返回符合条件的电影列表
 */
export async function getSubscribeMovieList(
  params: GetSubscribeMovieListParams  // 参数对象，包含查询条件、排序方式和分页信息
) {
  // 从参数中解构出查询条件(where)和排序方式(orderBy)，默认按创建时间降序排列
  const { where, orderBy = { createdAt: 'desc' } } = params;
  // 使用Prisma查询数据库，返回符合条件的电影列表
  return await prisma.movie.findMany({
    where: where,  // 查询条件
    orderBy: orderBy,  // 排序方式
    skip: params.skip,  // 跳过的记录数，用于分页
    take: params.take  // 获取的记录数，用于分页
  });
}
export async function getWeeklyAddedMovieData() {
  const addedMovieList = await prisma.movie.findMany({
    where: {
      addedAt: {
        not: null,
        gte: dayjs().subtract(7, 'day').startOf('day').toDate(), // 筛选最近 7 天的数据
        lte: dayjs().endOf('day').toDate()
      }
    },
    orderBy: {
      addedAt: 'desc'
    }
  });

  // 获取当前星期几（0-6，0 代表星期日）
  const today = dayjs().day();

  // 创建一个映射，将今天作为数组的第一个元素，然后逆向填充一周的日期
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const sortedWeekDays = [
    ...weekDays.slice(today),
    ...weekDays.slice(0, today)
  ];
  const sortedData = sortedWeekDays.map((day) => ({ day: day, total: 0 }));

  // 循环处理数据，按星期几分组
  addedMovieList.forEach((item: Movie) => {
    if (item.addedAt) {
      const addedDay = dayjs(item.addedAt).day(); // 获取星期几
      const index = (addedDay + 7 - today) % 7;
      sortedData[index].total++; // 增加对应星期几的 total
    }
  });

  return sortedData;
}

export async function getExistingSubscribe(
  filterType: string,
  filterValue: string
) {
  return await prisma.subscribe.findFirst({
    where: { filterType, filterValue }
  });
}

export async function getExistingMovieStatusByNumber(
  number: string
): Promise<MovieStatus | null> {
  const existingMovie = await prisma.movie.findUnique({
    where: { number }
  });
  if (existingMovie) {
    return existingMovie.status;
  }
  return null;
}

export async function getRecentlyAddedMovies() {
  const recentlyAdded = await prisma.movie.findMany({
    where: {
      status: MovieStatus.added,
      poster: { not: null },
      addedAt: { not: null }
    },
    orderBy: {
      addedAt: 'desc'
    },
    take: 4
  })
  return recentlyAdded;
}

