import { Magnet} from '../../types/javbus';
import { getMovieMagnets } from '../javbus-parser';
import { extractBestMagnet } from '../download-processor';
import { sleep } from '../utils';
import { getPushService } from './utils';
import { logger } from '../logger';

export async function taskMovieUpdate() {
  const taskName = 'JAVBus订阅影片更新';
  try {

    const { db } = await import('../db');
    const subscribeMovieList = await db.subscribeData.findMany({
      where: {
        status: 'subscribed'
      }
    }
    );
    let mustRules: ('isHD' | 'hasSubtitle')[] = [];
    const downloadRuleConfig = await db.setting.findUnique({
      where: {
        key: 'downloadRuleConfig'
      }
    });
    const config = downloadRuleConfig?.value as { onlyHD: boolean; onlyChineseSubtitles: boolean; checkForDuplicates: boolean } | null
    if (!config) return;
    if (config.onlyHD) {
      mustRules.push('isHD');
    }
    if (config.onlyChineseSubtitles) {
      mustRules.push('hasSubtitle');
    }

    for (const [index, subscribeMovie] of subscribeMovieList.entries()) {
      try {
        const movieDetail = subscribeMovie.detail as any;
        if (!movieDetail.uc || !movieDetail.gid) {
          logger.info(`无法获取影片 ${subscribeMovie.code} 的详情 (gid/uc)，跳过。`);
          continue; // continue 会直接开始下一次循环
        }
        // 2. 获取所有磁力链接
        const magnets: Magnet[] = await getMovieMagnets({
          movieId: subscribeMovie.code,
          gid: movieDetail.gid,
          uc: movieDetail.uc,
          sortBy: 'date',
          sortOrder: 'desc'
        });

        // 写入最新磁力链接
        await db.subscribeData.update({
          where: { id: subscribeMovie.id },
          data: { magnets: magnets as any }
        });

        if (magnets.length === 0) {
          logger.info(`影片 ${subscribeMovie.code} 没有找到任何磁力链接，跳过。`);
          continue;
        }
        const bestMagnet = extractBestMagnet(movieDetail.id, ['hasSubtitle','isHD'], ['uncensored', 'hasSubtitle', 'isHD', 'numberSize'], magnets);

        if (bestMagnet) {
          logger.info(`为影片 ${subscribeMovie.code} 选定的最佳磁链是: ${bestMagnet.title} (${bestMagnet.size})`);

          // 5. 准备并发送下载请求
          const requestBody = new FormData();
          requestBody.append('downloadURLs', JSON.stringify([bestMagnet.link]));
          requestBody.append('downloadImmediately', 'true');
          const movieData: any = subscribeMovie
          movieData.type = 'jav'
          requestBody.append('movie', JSON.stringify(movieData))

          // 在服务器端必须使用绝对路径！
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const response = await fetch(`${appUrl}/api/download`, {
            method: 'POST',
            body: requestBody
          });


          if (response.ok) {
            logger.info(await response.json());
            logger.info(`已成功为影片 ${subscribeMovie.code} 发送下载请求。`);
            await db.subscribeData.update({
                where: { id: subscribeMovie.id },
                data: { status: 'downloading' }
            });
          } else {
            const errorText = await response.text();
            logger.error(`为影片 ${subscribeMovie.code} 发送下载请求失败: ${response.status} - ${errorText}`);
          }

        } else {
          logger.warn(`根据筛选规则，没有为影片 ${subscribeMovie.code} 找到合适的磁力链接。`);
        }

      } catch (innerError) {
        const errorMessage = innerError instanceof Error ? innerError.message : '未知内部错误';
        logger.error(`处理影片 ${subscribeMovie.code} 时发生错误: ${errorMessage}。将继续处理下一个影片。`, );
      } finally {
        // 6. 延迟10秒执行下一次循环 (除非是最后一个)
        if (index < subscribeMovieList.length - 1) {
          logger.info(`等待 10 秒后继续...`);
          await sleep(10000);
        }
      }
    }

    

    logger.info(`${taskName} 执行完成。`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    logger.error(`${taskName} 执行失败: ${errorMessage}`);
  } finally {
    // 发送通知
    const pushService = await getPushService();
    // if (pushService) {
    //   await pushService.sendTaskNotification(taskName, 'failed', `错误详情: ${errorMessage}`);
    // }
  }
}

