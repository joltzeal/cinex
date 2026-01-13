import { Magnet, MovieDetail } from '@/types/javbus';
import { prisma } from '@/lib/prisma';
import { JellyfinMediaItem } from '@/lib/media-library/jellyfin-client';
import { logger } from '../logger';
import { getMediaLibraryCache, processMediaItemsForNumbers, refreshMediaLibraryCache } from './media-library';
import { getMovieDetail, getMovieMagnets, getPoster } from '@/lib/javbus/javbus-parser';
import { Prisma, MovieStatus } from '@prisma/client';
import { HTTPError } from 'got';
export async function taskMediaScraping() {
  const taskName = '媒体刮削';
  

  logger.info(`开始执行 ${taskName}`);
  try {
    await refreshMediaLibraryCache();
    const a = getMediaLibraryCache().items;
    const list: JellyfinMediaItem[] = getMediaLibraryCache().items;
    const { matchedItems, unmatchedItems, allExtractedNumbers, duplicateNumbers } = processMediaItemsForNumbers(list);
    logger.info(`媒体库中提取到的番号数量: ${allExtractedNumbers.length}`);
    const inDbNumbers = await prisma.movie.findMany({
      select: {
        number: true
      },
      where: {
        number: {
          in: allExtractedNumbers
        }
      }
    });

    logger.info(`在数据库中存在的番号数量: ${inDbNumbers.map((item: { number: any; }) => item.number)}`);
    const allExtractedNumbersSet = new Set(allExtractedNumbers);
    logger.warn(`在数据库中不存在的番号数量: ${allExtractedNumbersSet.size - inDbNumbers.length}`);
    const notInDbNumbers = allExtractedNumbers.filter(item => !inDbNumbers.some((dbItem: { number: string; }) => dbItem.number === item));
    for (const itemNumber of notInDbNumbers) {
      try {
        logger.info(`开始获取番号: ${itemNumber},时间: ${new Date().toISOString()}`);
        const movieDetail: MovieDetail = await getMovieDetail(itemNumber);
        // TODO: 添加搜索错误处理
        const magnets: Magnet[] = await getMovieMagnets({
          movieId: movieDetail.id,
          gid: movieDetail.gid!,
          uc: movieDetail.uc!,
          sortBy: 'date',
          sortOrder: 'desc'

        });
        await prisma.movie.upsert({
          where: { number: movieDetail.id },
          update: {
          },
          create: {
            number: movieDetail.id,
            title: movieDetail.title,
            detail: movieDetail as unknown as Prisma.InputJsonValue,
            magnets: magnets as unknown as Prisma.InputJsonValue,
            cover: movieDetail.img,
            poster: getPoster(movieDetail.img!) ?? null,
            date: movieDetail.date,
            status: MovieStatus.uncheck,
          }
        });

      } catch (error) {
        if (error instanceof HTTPError) {
          logger.error(`无法在 Javbus 获取到${itemNumber} 的详情`);
        }else{
          logger.error(`获取番号: ${itemNumber} 失败: ${error}`);
        }
      } finally {
        // 添加等待
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

  } catch (error) {
    logger.error(`[${taskName}] 执行失败: ${error}`);
  } finally {
    logger.info(`[${taskName}] 执行完成`);
  }
}
