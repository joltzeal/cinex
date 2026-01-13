import { FilterType, Movie, MovieDetail } from '@/types/javbus';
import { getMovieDetail, getMovieMagnets, getMoviesByPage } from '@/lib/javbus/javbus-parser';
import { sleep } from '../utils';
import { getPushService } from './utils';
import { prisma } from '@/lib/prisma';
import { logger } from '../logger';
import { getSetting, SettingKey } from '@/services/settings';
import { MovieStatus, Prisma } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/client';


function isSingleMovie(movieDetail: MovieDetail) {
  return movieDetail.genres.some(genre => genre.name === '單體作品');
}
function isVRMovie(movieDetail: MovieDetail) {
  return movieDetail.genres.some(genre => genre.name === '8KVR' || genre.name === 'VR' || genre.name === 'VR専用');
}

function isIntroductionMovie(movieDetail: MovieDetail) {
  return movieDetail.genres.some(genre => genre.name === '介紹影片');
}

function isCollectionMovie(movieDetail: MovieDetail) {
  return movieDetail.genres.some(genre => genre.name === '合集');
}

function isBestMovie(movieDetail: MovieDetail) {
  return movieDetail.genres.some(genre => genre.name === '女優ベスト・総集編');
}



export async function taskJavbusSubscribeUpdate() {
  const taskName = 'JAVBus订阅增量更新';
  logger.info(`开始执行 ${taskName}`);

  try {
    // 获取所有订阅
    const subscriptions = await prisma.subscribe.findMany({
      include: {
        movies: {
          include: {
            movie: true // 包含实际的 Movie 数据
          }
        },
      },
    });
    logger.info(subscriptions.length);
    if (subscriptions.length === 0) {
      logger.info('没有找到任何JAVBus订阅，跳过更新');
      return;
    }
    const downloadRuleConfigSetting = await getSetting(SettingKey.DownloadRuleConfig);
    const downloadRuleConfig = downloadRuleConfigSetting as DownloadRuleConfig;
    let totalNewMovies = 0;
    const updateResults: Array<{
      filterType: string;
      filterValue: string;
      newCount: number;
      filter: JsonValue;
    }> = [];
    for (let i = 0; i < subscriptions.length; i++) {
      const subscribeItem = subscriptions[i];
      const { filterType, filterValue } = subscribeItem;
      logger.info(filterType);
      logger.info(filterValue);
      try {
        const existingSourceIdSet = new Set(
          subscribeItem.movies.map((m: { movie: { number: any; }; }) => m.movie.number)
        );
        const newMovies: Movie[] = [];
        let stopScraping = false;
        let currentPage = 1;
        const MAX_PAGES_PER_SUBSCRIPTION = 5; // 每个订阅最多检查5页
        const REQUEST_DELAY = 3000; // 3秒延迟
        while (!stopScraping && currentPage <= MAX_PAGES_PER_SUBSCRIPTION) {
          logger.info(`检查第 ${currentPage} 页...`);

          const pageResult = await getMoviesByPage({
            page: String(currentPage),
            type: "normal",
            magnet: "exist",
            filterType: filterType as FilterType,
            filterValue,
          });

          if (!pageResult.movies || pageResult.movies.length === 0) {
            logger.info(`第 ${currentPage} 页没有电影，停止检查`);
            break;
          }

          // 检查是否有新电影
          for (const movie of pageResult.movies) {
            if (existingSourceIdSet.has(movie.id || '')) {
              logger.info(`发现已存在的电影 ID: ${movie.id}，停止检查`);
              stopScraping = true;
              break;
            }
            newMovies.push(movie);
          }

          if (stopScraping) break;

          // 检查是否有下一页
          if (!pageResult.pagination?.hasNextPage) {
            logger.info('没有更多页面，停止检查');
            break;
          }

          currentPage = pageResult.pagination.nextPage ?? currentPage + 1;

          // 在请求间添加延迟
          if (currentPage <= MAX_PAGES_PER_SUBSCRIPTION) {
            logger.info(`等待 ${REQUEST_DELAY}ms 后继续...`);
            await sleep(REQUEST_DELAY);
          }
        }
        if (newMovies.length > 0) {
          logger.info(`发现 ${newMovies.length} 部新电影，保存到数据库`);
          for (const movie of newMovies) {
            const existingMovie = await prisma.movie.findUnique({
              where: { number: movie.id }  // movie.id 是电影的番号
            });
            if (existingMovie) {
              await prisma.movie.update({
                where: { id: existingMovie.id },
                data: { poster: movie.img }
              });
              logger.info(`影片 ${movie.id} 已存在，跳过。`);
              await prisma.subscribeMovie.upsert({
                where: { subscribeId_movieId: { subscribeId: subscribeItem.id, movieId: existingMovie.id } },
                update: {
                  // poster: movie.img,
                },
                create: { subscribeId: subscribeItem.id, movieId: existingMovie.id,  }
              });
              continue;
            }
            // 创建电影
            const movieCreate: Prisma.MovieCreateInput = {
              number: movie.id,
              title: movie.title,
              date: movie.date,
              poster: movie.img,
              status: MovieStatus.uncheck,
            };
            const createdMovie = await prisma.movie.create({
              data: movieCreate
            });
            // 创建订阅关系
            await prisma.subscribeMovie.create({
              data: { subscribeId: subscribeItem.id, movieId: createdMovie.id }
            });
            const movieDetail = await getMovieDetail(movie.id);
            const magnets = await getMovieMagnets({
              movieId: movie.id,
              gid: movieDetail.gid!,
              uc: movieDetail.uc!,
              sortBy: 'date',
              sortOrder: 'desc'
            });
            // 更新电影
            await prisma.movie.update({
              where: { id: createdMovie.id },
              data: {
                detail: movieDetail as unknown as Prisma.InputJsonValue,
                magnets: magnets as unknown as Prisma.InputJsonValue,
                cover: movieDetail.img,
              }
            });
            if (magnets.length === 0) {
              logger.info(`影片 ${movie.id} 没有找到任何磁力链接，跳过。`);
              continue;
            }
            // 分析电影，是否需要订阅
            if (downloadRuleConfig?.onlySingleMovie && !isSingleMovie(movieDetail)) {
              logger.info(`影片 ${movie.id} 不是单体影片，跳过。`);
              continue;
            }
            if (isIntroductionMovie(movieDetail) || isBestMovie(movieDetail)) {
              logger.info(`影片 ${movie.id} 是介绍影片或女優ベスト・総集編，跳过。`);
              continue;
            }
            if (!downloadRuleConfig?.downloadVR && isVRMovie(movieDetail)) {
              // 不下载VR影片
              continue;
            }
            await prisma.movie.update({
              where: { id: createdMovie.id },
              data: {
                status: MovieStatus.subscribed,
                subscribeAt: new Date()
              }
            });

          }
          totalNewMovies += newMovies.length;
          updateResults.push({
            filterType,
            filterValue,
            newCount: newMovies.length,
            filter: subscribeItem.filter
          });
        } else {
          logger.info(`订阅 ${filterType}=${filterValue} 没有新电影`);
        }
        if (i < subscriptions.length - 1) {
          const SUBSCRIPTION_DELAY = 10000; // 10秒延迟
          // logger.info(`等待 ${SUBSCRIPTION_DELAY}ms 后处理下一个订阅...`);
          await sleep(SUBSCRIPTION_DELAY);
        }
        await prisma.subscribe.update({
          where: { id: subscribeItem.id },
          data: { updatedAt: new Date() }
        });
      } catch (error) {
        logger.error(`执行 ${taskName} 时发生错误:${error}`,);
        throw error;
      }

    }
    logger.info(`${taskName} 执行完成。`);
    // 发送通知
    if (totalNewMovies > 0) {
      const pushService = await getPushService();
      if (pushService) {
        const details = updateResults.map(result => {
          let subscribeName = (result.filter as any).name;
          return `• ${subscribeName}: 新增 ${result.newCount} 部新电影`
        }
        ).join('\n');

        await pushService.sendTaskNotification(
          taskName,
          'success',
          `共发现 ${totalNewMovies} 部新电影\n\n更新详情:\n${details}`
        );
      }
    } else {
      logger.info('没有发现新电影，跳过推送通知');
    }
    // 为每个订阅执行增量更新
  } catch (error) {
    logger.error(`执行 ${taskName} 时发生错误:${error}`,);
    throw error;
  }
}