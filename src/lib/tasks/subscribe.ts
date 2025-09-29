import { FilterType, Movie, MovieDetail } from '../../types/javbus';
import { getMovieDetail, getMovieMagnets, getMoviesByPage } from '../javbus-parser';
import { sleep } from '../utils';
import { getPushService } from './utils';
import { JsonValue } from 'generated/prisma/runtime/library';
import { extractBestMagnet } from '../download-processor';
import { db } from '../db';
import { logger } from '../logger';

function isSingleMovie(movieDetail: MovieDetail) {
  return movieDetail.genres.some(genre => genre.name === '單體作品');
}
function isVRMovie(movieDetail: MovieDetail) {
  return movieDetail.genres.some(genre => genre.name === '8KVR' || genre.name === 'VR' || genre.name === 'VR専用');
}

export async function taskJavbusSubscribeUpdate() {
  const taskName = 'JAVBus订阅增量更新';
  logger.info(`开始执行 ${taskName}`);

  try {


    // 获取所有活跃的JAVBus订阅
    const subscriptions = await db.subscribeJAVBus.findMany({
      include: {
        movies: {
          select: { code: true }
        }
      }
    });

    if (subscriptions.length === 0) {
      logger.info('没有找到任何JAVBus订阅，跳过更新');
      return;
    }

    logger.info(`找到 ${subscriptions.length} 个订阅，开始增量更新`);

    let totalNewMovies = 0;
    const updateResults: Array<{
      filterType: string;
      filterValue: string;
      newCount: number;
      filter: JsonValue;
    }> = [];
    const downloadRuleConfigSetting = await db.setting.findUnique({
      where: {
        key: 'downloadRuleConfig'
      }
    });
    const downloadRuleConfig = downloadRuleConfigSetting?.value as { onlyHD: boolean; onlyChineseSubtitles: boolean; checkForDuplicates: boolean; downloadVR: boolean; onlySingleMovie: boolean } | null

    // 为每个订阅执行增量更新
    for (let i = 0; i < subscriptions.length; i++) {
      const subscription = subscriptions[i];
      const { filterType, filterValue } = subscription;

      logger.info(`处理订阅 ${i + 1}/${subscriptions.length}: ${filterType}=${filterValue}`);

      try {
        // 获取现有电影ID集合
        const existingSourceIdSet = new Set(
          subscription.movies.map(m => m.code)
        );

        const newMovies: Movie[] = [];
        let stopScraping = false;
        let currentPage = 1;
        const MAX_PAGES_PER_SUBSCRIPTION = 5; // 每个订阅最多检查5页
        const REQUEST_DELAY = 3000; // 3秒延迟

        // 检查新电影


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

        // 如果有新电影，保存到数据库
        if (newMovies.length > 0) {
          logger.info(`发现 ${newMovies.length} 部新电影，保存到数据库`);
          for (const movie of newMovies) {
            const movieDetail = await getMovieDetail(movie.id);
            const magnets = await getMovieMagnets({
              movieId: movie.id,
              gid: movieDetail.gid!,
              uc: movieDetail.uc!,
              sortBy: 'date',
              sortOrder: 'desc'
            });
            const subscribeCreated = await db.subscribeData.create({
              data: {
                subscribeId: subscription.id,
                detail: movieDetail as any,
                cover: movieDetail.img,
                magnets: magnets as any,
                code: movie.id,
                title: movie.title,
                date: movie.date,
                tags: movie.tags,
                poster: movie.img ?? null,
                status: "uncheck" as const
              }
            });

            if (magnets.length === 0) {
              logger.info(`影片 ${movie.id} 没有找到任何磁力链接，跳过。`);
              continue;
            }

            if (downloadRuleConfig?.onlySingleMovie && !isSingleMovie(movieDetail)) {
              continue;
            }
            if (!downloadRuleConfig?.downloadVR && isVRMovie(movieDetail) ) {
              // 不下载VR影片
              continue;
            }
            await db.subscribeData.update({
              where: { id: subscribeCreated.id },
              data: { status: 'subscribed' }
            });

          }

          totalNewMovies += newMovies.length;
          updateResults.push({
            filterType,
            filterValue,
            newCount: newMovies.length,
            filter: subscription.filter
          });
        } else {
          logger.info(`订阅 ${filterType}=${filterValue} 没有新电影`);
        }

        // 在订阅间添加更长的延迟，避免过于频繁的请求
        if (i < subscriptions.length - 1) {
          const SUBSCRIPTION_DELAY = 10000; // 10秒延迟
          logger.info(`等待 ${SUBSCRIPTION_DELAY}ms 后处理下一个订阅...`);
          await sleep(SUBSCRIPTION_DELAY);
        }

        await db.subscribeJAVBus.update({
          where: { id: subscription.id },
          data: { updatedAt: new Date() }
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        logger.error(`处理订阅 ${filterType}=${filterValue} 时出错: ${errorMessage}`);
        // 继续处理下一个订阅，不中断整个任务
      }
    }

    // 任务完成，只在有更新时发送通知
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

    logger.info(`${taskName} 执行完成，共发现 ${totalNewMovies} 部新电影`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    logger.error(`${taskName} 执行失败: ${errorMessage}`);

    // 发送失败通知

    try {
      const pushService = await getPushService();
      if (pushService) {
        await pushService.sendTaskNotification(taskName, 'failed', `错误详情: ${errorMessage}`);
      }
    } catch (error) {
      logger.error(`发送失败通知失败: ${errorMessage}`);
    }
  }
}