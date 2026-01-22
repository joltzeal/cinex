import { Magnet, MovieDetail } from '@/types/javbus';
import { getMovieDetail, getMovieMagnets } from '@/lib/javbus/javbus-parser';
import { extractBestMagnet } from '@/lib/download/download-processor';
import { sleep } from '../utils';
import { getPushService } from './utils';
import { logger } from '../logger';
import { getSetting, SettingKey } from '@/services/settings';
import { Movie, MovieStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
export async function taskMovieUpdate() {
  const taskName = 'JAVBus订阅影片更新';
  let successMovies: Movie[] = [];
  try {
    const movies = await prisma.movie.findMany({
      where: {
        status: MovieStatus.subscribed
      }
    });
    // 检查订阅下载条件 /是否为高清/是否为中文字幕
    let mustRules: ('isHD' | 'hasSubtitle')[] = [];
    const downloadRuleConfig = await getSetting(SettingKey.DownloadRuleConfig);
    const config = downloadRuleConfig
    if (!config) return;
    if (config.onlyHD) {
      mustRules.push('isHD');
    }
    if (config.onlyChineseSubtitles) {
      mustRules.push('hasSubtitle');
    }

    for (const [index, subscribeMovie] of movies.entries()) {
      try {
        let movieDetail: MovieDetail;
        if (!subscribeMovie.detail) {
          const getMovieDetailRes = await getMovieDetail(subscribeMovie.number);
          const dbMovie = await prisma.movie.update({
            where: { id: subscribeMovie.id },
            data: { detail: getMovieDetailRes as unknown as Prisma.InputJsonValue }
          });
          movieDetail = dbMovie.detail as unknown as MovieDetail;
        } else {
          movieDetail = subscribeMovie.detail as unknown as MovieDetail;
        }
        if (!movieDetail.uc || !movieDetail.gid) {
          logger.info(`无法获取影片 ${subscribeMovie.number} 的详情 (gid/uc)，跳过。`);
          continue;
        }
        // 2. 获取所有磁力链接
        let magnets: Magnet[] = await getMovieMagnets({
          movieId: subscribeMovie.number,
          gid: movieDetail.gid,
          uc: movieDetail.uc,
          sortBy: 'date',
          sortOrder: 'desc'
        });
        // 写入最新磁力链接
        await prisma.movie.update({
          where: { id: subscribeMovie.id },
          data: { magnets: magnets as unknown as Prisma.InputJsonValue }
        });
        if (magnets.length === 0) {
          logger.info(`影片 ${subscribeMovie.number} 没有找到任何磁力链接，跳过。`);
          continue;
        }
        // 根据当前 magnets 提取最佳磁力链接
        // 筛选出不是亚博/等乱七八糟的影片
        magnets = magnets.filter(magnet =>
          magnet.title !== `${subscribeMovie.number.toLowerCase()}ch`
          || magnet.title !== `${subscribeMovie.number}ch`
          // ![`${subscribeMovie.number}C`].includes(magnet.title)
        );

        const bestMagnet = extractBestMagnet(movieDetail.id, ['hasSubtitle', 'isHD'], ['uncensored', 'hasSubtitle', 'isHD', 'numberSize'], magnets);
        // 5. 准备并发送下载请求
        if (bestMagnet) {
          let images;
          if ((movieDetail as MovieDetail)?.samples) {
            images = [subscribeMovie.poster, subscribeMovie.cover, ...(subscribeMovie as unknown as MovieDetail)?.samples.map((img) => img.src)]
          } else {
            images = [subscribeMovie.poster, subscribeMovie.cover,]
          }
          const requestBody = new FormData();
          requestBody.append('downloadURLs', JSON.stringify([bestMagnet.link]));
          requestBody.append('downloadImmediately', 'true');
          requestBody.append('title', movieDetail.title || subscribeMovie.title);
          requestBody.append('images', JSON.stringify(images))
          // const movieData: any = subscribeMovie
          requestBody.append('movieId', subscribeMovie.id)
          const response = await fetch('http://localhost:3000/api/download', {
            method: 'POST',
            body: requestBody
          });
          if (response.ok) {
            logger.info(`已成功为影片 ${subscribeMovie.number} 发送下载请求。`);
            successMovies.push(subscribeMovie);
            await prisma.movie.update({
              where: { id: subscribeMovie.id },
              data: { status: MovieStatus.downloading, downloadAt: new Date() }
            });
          } else {
            const errorText = await response.text();
            logger.error(`为影片 ${subscribeMovie.number} 发送下载请求失败: ${response.status} - ${errorText}`);
          }
        } else {
          logger.info(`根据筛选规则，没有为影片 ${subscribeMovie.number} 找到合适的磁力链接。`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知内部错误';
        logger.error(`处理影片 ${subscribeMovie.number} 时发生错误: ${errorMessage}。将继续处理下一个影片。`);
      } finally {
        if (index < movies.length - 1) {
          logger.info(`等待 10 秒后继续...`);
          await sleep(10000);
        }
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    logger.error(`${taskName} 执行失败: ${errorMessage}`);
  } finally {
    // 发送通知
    if (successMovies.length > 0) {
      const pushService = await getPushService();
      if (pushService) {
        await pushService.sendTaskNotification(taskName, 'success', `成功处理 ${successMovies.length} 部影片。\n\n处理详情:\n${successMovies.map(movie => `• ${movie.number}`).join('\n')}`);
      }
    }
  }
}

