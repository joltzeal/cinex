import { JellyfinClient, JellyfinConfig, JellyfinMediaItem } from '../jellyfin-client';
import { db } from '../db';
import { MovieStatus, Prisma } from '@prisma/client';
import { logger } from '../logger';

/**
 * 媒体库缓存
 */
interface MediaLibraryCache {
  items: JellyfinMediaItem[];
  lastUpdated: Date | null;
}

// 全局缓存
let mediaLibraryCache: MediaLibraryCache = {
  items: [],
  lastUpdated: null,
};

/**
 * 刷新媒体库缓存
 * 从 Jellyfin 服务器获取所有媒体库项目并存储到全局缓存中
 */
export async function refreshMediaLibraryCache(): Promise<void> {
  try {
    // 获取 Jellyfin 配置
    const JELLYFIN_CONFIG = await db.setting.findUnique({ 
      where: { key: 'mediaServerConfig' } 
    }) as any;
    
    if (!JELLYFIN_CONFIG?.value) {
      logger.warn('[Media Library Cache] Jellyfin 配置未找到');
      return;
    }

    const client = new JellyfinClient(JELLYFIN_CONFIG.value as JellyfinConfig);
    
    // 获取所有媒体库
    const libraries = await client.getMediaLibraries();
    
    // 获取所有媒体项
    let allMediaItems: JellyfinMediaItem[] = [];
    for (const library of libraries) {
      logger.info(`[Media Library Cache] 扫描媒体库 "${library.Name}"...`);
      const itemsInLibrary = await client.getAllItemsRecursive(library.Id);
      allMediaItems.push(...itemsInLibrary);
    }

    // 更新缓存
    mediaLibraryCache.items = allMediaItems;
    mediaLibraryCache.lastUpdated = new Date();
    
    logger.info(`[Media Library Cache] 缓存已更新，共 ${allMediaItems.length} 个媒体项`);
  } catch (error) {
    logger.error(`[Media Library Cache] 刷新缓存失败: ${error}`);
    throw error;
  }
}

/**
 * 获取缓存的媒体库项目
 */
export function getMediaLibraryCache(): MediaLibraryCache {
  return mediaLibraryCache;
}

/**
 * 通过ID或标题查找媒体项
 * @param sourceId 源ID（如番号）
 * @param title 标题
 * @returns 匹配的媒体项或null
 */
export function findMediaItemByIdOrTitle(
  sourceId?: string, 
  title?: string
): JellyfinMediaItem | null {
  if (!sourceId && !title) {
    logger.warn('[Media Library Cache] 必须提供 番号 或 标题 中的至少一个');
    return null;
  }

  const { items } = mediaLibraryCache;
  
  if (items.length === 0) {
    logger.warn('[Media Library Cache] 无缓存');
    return null;
  }

  // 优先通过 sourceId 匹配
  if (sourceId) {
    const sourceIdLower = sourceId.toLowerCase();
    for (const item of items) {
      const textToSearch = `${item.Name} ${item.OriginalTitle || ''} ${item.SortName || ''}`;
      if (textToSearch.toLowerCase().includes(sourceIdLower)) {
        logger.info(`[Media Library Cache] 通过ID "${sourceId}" 找到媒体项: ${item.Name}`);
        return item;
      }
    }
  }

  // 通过标题匹配
  if (title) {
    const titleLower = title.toLowerCase();
    for (const item of items) {
      const itemNameLower = item.Name.toLowerCase();
      // 双向包含匹配：Jellyfin标题包含查询标题，或查询标题包含Jellyfin标题
      if (itemNameLower.includes(titleLower) || titleLower.includes(itemNameLower)) {
        logger.info(`[Media Library Cache] 通过标题 "${title}" 找到媒体项: ${item.Name}`);
        return item;
      }
    }
  }

  logger.info(`[Media Library Cache] 未找到匹配的媒体项 (sourceId: ${sourceId}, title: ${title})`);
  return null;
}

/**
 * 批量查找媒体项
 * @param items 包含 id/number 和 title 的对象数组
 * @returns Map<主键ID, 媒体项>
 */
export function findMediaItemsBatch(
  items: Array<{ id: string; number: string; title: string }>
): Map<string, JellyfinMediaItem> {
  const matchesToUpdate = new Map<string, JellyfinMediaItem>();
  const { items: cachedItems } = mediaLibraryCache;

  if (cachedItems.length === 0) {
    logger.warn('[Media Library Cache] 缓存为空，无法进行批量查找');
    return matchesToUpdate;
  }

  // 第一轮：通过 ID (number) 匹配
  const sourceIdRegex = new RegExp(`(${items.map(s => s.number).join('|')})`, 'i');
  const sourceIdToPkMap = new Map<string, string>();
  items.forEach(s => sourceIdToPkMap.set(s.number.toLowerCase(), s.id));

  for (const mediaItem of cachedItems) {
    const textToSearch = `${mediaItem.Name} ${mediaItem.OriginalTitle || ''} ${mediaItem.SortName || ''}`;
    const match = textToSearch.match(sourceIdRegex);
    if (match) {
      const foundSourceId = match[1].toLowerCase();
      const pkId = sourceIdToPkMap.get(foundSourceId);
      if (pkId && !matchesToUpdate.has(pkId)) {
        matchesToUpdate.set(pkId, mediaItem);
        sourceIdToPkMap.delete(foundSourceId);
      }
    }
  }

  const matchedByIdCount = matchesToUpdate.size;
  logger.info(`[Media Library Cache] 通过ID匹配到 ${matchedByIdCount} 条记录`);

  // 第二轮：通过标题匹配未匹配的项
  const remainingItems = items.filter(s => !matchesToUpdate.has(s.id));
  
  if (remainingItems.length > 0) {
    const jellyfinTitleToItemMap = new Map<string, JellyfinMediaItem>();
    cachedItems.forEach(item => jellyfinTitleToItemMap.set(item.Name.toLowerCase(), item));

    let matchedByTitleCount = 0;
    remainingItems.forEach(item => {
      const itemTitleLower = item.title.toLowerCase();
      let isFound = false;
      jellyfinTitleToItemMap.forEach((mediaItem, jellyfinTitle) => {
        if (isFound) return;
        if (jellyfinTitle.includes(itemTitleLower)) {
          if (!matchesToUpdate.has(item.id)) {
            matchesToUpdate.set(item.id, mediaItem);
            matchedByTitleCount++;
            isFound = true;
          }
        }
      });
    });

    logger.info(`[Media Library Cache] 通过标题匹配到 ${matchedByTitleCount} 条记录`);
  }

  return matchesToUpdate;
}

/**
 * Jellyfin 媒体库同步任务
 */
export async function taskMovieLibraryUpdate() {
  try {
    // 刷新媒体库缓存
    await refreshMediaLibraryCache();
    
    // 清空数据库中状态为added的记录
    await db.movie.updateMany({
      where: {
        status: MovieStatus.added,
      },
      data: {
        status: MovieStatus.uncheck,
        mediaLibrary: undefined,
      }
    })

    // 获取所有Movie 
    const movieList = await db.movie.findMany({
      select: { id: true, title: true, number: true }
    });

    // 批量查找匹配的媒体项
    const matchesToUpdate = findMediaItemsBatch(movieList);

    // 数据库更新逻辑
    if (matchesToUpdate.size > 0) {
      const updatePromises: any[] = [];

      matchesToUpdate.forEach((mediaItem, pkId) => {
        const { ...mediaLibraryData } = mediaItem;
        updatePromises.push(
          db.movie.update({
            where: { id: pkId },
            data: {
              status: MovieStatus.added,
              mediaLibrary: mediaLibraryData as Prisma.InputJsonValue,
            },
          })
        );
      });

      await db.$transaction(updatePromises);
      logger.info(`[Media Library Sync] ${matchesToUpdate.size} 条记录更新完成`);
    } else {
      logger.info('[Media Library Sync] 没有找到需要更新的记录');
    }
  } catch (error) {
    logger.error(`[Media Library Sync] 媒体库同步失败: ${error}`);
  }
}

