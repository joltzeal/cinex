import { JellyfinClient, JellyfinConfig, JellyfinMediaItem } from '../jellyfin-client';
import { db } from '../db';
import { Prisma } from '@prisma/client';
import { logger } from '../logger';


export async function taskMovieLibraryUpdate() {
  const taskName = 'Jellyfin媒体库同步';
  try {
    // 获取 Jellyfin 配置
    const JELLYFIN_CONFIG = await db.setting.findUnique({ where: { key: 'mediaServerConfig' } }) as any;
    if (!JELLYFIN_CONFIG) return;
    // 获取所有Movie 
    const subscribeList = await db.subscribeData.findMany({
      // where: { status: { not: 'added' } },
      select: { id: true, title: true, code: true }
    });
    const client = new JellyfinClient(JELLYFIN_CONFIG?.value as JellyfinConfig);
    // 获取所有媒体库
    const libraries = await client.getMediaLibraries();
    // 获取所有Movie 媒体项
    let allMediaItems: JellyfinMediaItem[] = [];
    for (const library of libraries) {
      // 我们只关心 "collectionType": "movies" 或 "tvshows" 的库
      // Jellyfin API 返回的 Type 是 'CollectionFolder'
      logger.info(`[Media Library Sync] 扫描媒体库 "${library.Name}"...`);
      const itemsInLibrary = await client.getAllItemsRecursive(library.Id);
      allMediaItems.push(...itemsInLibrary);
    }

    const matchesToUpdate = new Map<string, JellyfinMediaItem>();

    logger.info('[Media Library Sync] 开始匹配源ID...');
    const sourceIdRegex = new RegExp(`(${subscribeList.map(s => s.code).join('|')})`, 'i');
    const sourceIdToPkMap = new Map<string, string>();
    subscribeList.forEach(s => sourceIdToPkMap.set(s.code.toLowerCase(), s.id));

    for (const mediaItem of allMediaItems) {
      const textToSearch = `${mediaItem.Name} ${mediaItem.OriginalTitle || ''} ${mediaItem.SortName || ''}`;
      const match = textToSearch.match(sourceIdRegex);
      if (match) {
        const foundSourceId = match[1].toLowerCase();
        const pkId = sourceIdToPkMap.get(foundSourceId);
        if (pkId && !matchesToUpdate.has(pkId)) {
          // 🔥 存储主键ID和完整的 mediaItem 对象
          matchesToUpdate.set(pkId, mediaItem);
          sourceIdToPkMap.delete(foundSourceId);
        }
      }
    }
    const matchedByIdCount = matchesToUpdate.size;
    logger.info(`[Media Library Sync] 第一轮匹配完成. 匹配到 ${matchedByIdCount} 条记录`);

    logger.info('[Media Library Sync] 开始匹配标题...');
    let matchedByTitleCount = 0;
    const remainingSubscriptions = subscribeList.filter(s => !matchesToUpdate.has(s.id));

    if (remainingSubscriptions.length > 0 && allMediaItems.length > 0) {
      const jellyfinTitleToItemMap = new Map<string, JellyfinMediaItem>();
      allMediaItems.forEach(item => jellyfinTitleToItemMap.set(item.Name.toLowerCase(), item));

      remainingSubscriptions.forEach(sub => {
        const subTitleLower = sub.title.toLowerCase();
        let isFound = false;
        jellyfinTitleToItemMap.forEach((mediaItem, jellyfinTitle) => {
          if (isFound) return;
          if (jellyfinTitle.includes(subTitleLower)) {
            if (!matchesToUpdate.has(sub.id)) {
              matchesToUpdate.set(sub.id, mediaItem);
              matchedByTitleCount++;
              isFound = true;
            }
          }
        });
      });
    }


    // --- 3. 数据库更新逻辑 (重构为事务) ---
    if (matchesToUpdate.size > 0) {

      const updatePromises: any[] = []; // 使用 any[] 来避免复杂的 Promise 类型体操

      // 🔥 使用 forEach 替代 for...of 遍历 Map
      matchesToUpdate.forEach((mediaItem, pkId) => {
        const { ...mediaLibraryData } = mediaItem;
        updatePromises.push(
          db.subscribeData.update({
            where: { id: pkId },
            data: {
              status: 'added',
              mediaLibrary: mediaLibraryData as Prisma.InputJsonValue,
            },
          })
        );
      });

      await db.$transaction(updatePromises);
      logger.info(`[Media Library Sync] ${matchesToUpdate.size} 条记录更新完成`);

    } else {
    }
  } catch (error) {
    logger.error(`[Media Library Sync] 媒体库同步失败:${error}`);
  }
}

