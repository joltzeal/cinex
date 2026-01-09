import {
  JellyfinClient,
  JellyfinConfig,
  JellyfinMediaItem
} from '@/lib/media-library/jellyfin-client';
import { prisma } from '@/lib/prisma';
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
  lastUpdated: null
};

/**
 * 刷新媒体库缓存
 * 从 Jellyfin 服务器获取所有媒体库项目并存储到全局缓存中
 */
export async function refreshMediaLibraryCache(): Promise<void> {
  try {
    // 获取 Jellyfin 配置
    const JELLYFIN_CONFIG = (await prisma.setting.findUnique({
      where: { key: 'mediaServerConfig' }
    })) as any;

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

    logger.info(
      `[Media Library Cache] 缓存已更新，共 ${allMediaItems.length} 个媒体项`
    );
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
        logger.info(
          `[Media Library Cache] 通过ID "${sourceId}" 找到媒体项: ${item.Name}`
        );
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
      if (
        itemNameLower.includes(titleLower) ||
        titleLower.includes(itemNameLower)
      ) {
        logger.info(
          `[Media Library Cache] 通过标题 "${title}" 找到媒体项: ${item.Name}`
        );
        return item;
      }
    }
  }

  logger.info(
    `[Media Library Cache] 未找到匹配的媒体项 (sourceId: ${sourceId}, title: ${title})`
  );
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
  const sourceIdRegex = new RegExp(
    `(${items.map((s) => s.number).join('|')})`,
    'i'
  );
  const sourceIdToPkMap = new Map<string, string>();
  items.forEach((s) => sourceIdToPkMap.set(s.number.toLowerCase(), s.id));

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
  const remainingItems = items.filter((s) => !matchesToUpdate.has(s.id));

  if (remainingItems.length > 0) {
    const jellyfinTitleToItemMap = new Map<string, JellyfinMediaItem>();
    cachedItems.forEach((item) =>
      jellyfinTitleToItemMap.set(item.Name.toLowerCase(), item)
    );

    let matchedByTitleCount = 0;
    remainingItems.forEach((item) => {
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

    logger.info(
      `[Media Library Cache] 通过标题匹配到 ${matchedByTitleCount} 条记录`
    );
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
    await prisma.movie.updateMany({
      where: {
        status: MovieStatus.added
      },
      data: {
        status: MovieStatus.uncheck,
        mediaLibrary: undefined
      }
    });

    // 获取所有Movie
    const movieList = await prisma.movie.findMany({
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
          prisma.movie.update({
            where: { id: pkId },
            data: {
              status: MovieStatus.added,
              mediaLibrary: mediaLibraryData as Prisma.InputJsonValue
            }
          })
        );
      });

      await prisma.$transaction(updatePromises);
      logger.info(
        `[Media Library Sync] ${matchesToUpdate.size} 条记录更新完成`
      );
    } else {
      logger.info('[Media Library Sync] 没有找到需要更新的记录');
    }
  } catch (error) {
    logger.error(`[Media Library Sync] 媒体库同步失败: ${error}`);
  }
}

export function processMediaItemsForNumbers(mediaItems: JellyfinMediaItem[]) {
  // 正则表达式：匹配至少一个大写字母，接着一个连字符，再接着至少一个数字
  // 允许前后有其他字符，但我们只捕获番号部分
  const numberRegex = /[A-Z]+\-\d+/g; // 使用 g 标志可以找到所有匹配项

  const matchedItems: { item: JellyfinMediaItem; numbers: string[] }[] = [];
  const unmatchedItems: JellyfinMediaItem[] = [];
  const allExtractedNumbers: string[] = []; // 用于检测所有提取到的番号
  const filteredMediaItems = mediaItems.filter(
    (item) => item.Type !== 'BoxSet'
  );
  filteredMediaItems.forEach((item) => {
    const foundNumbers: string[] = [];
    const fieldsToSearch = [item.Name, item.OriginalTitle, item.SortName];

    for (const field of fieldsToSearch) {
      if (field) {
        // 使用 matchAll 找到所有匹配项
        const matches = field.matchAll(numberRegex);
        for (const match of matches) {
          // 将匹配到的番号转换为大写，并添加到 foundNumbers
          foundNumbers.push(match[0].toUpperCase());
        }
      }
    }

    if (foundNumbers.length > 0) {
      // 过滤掉重复的番号（如果一个媒体项的多个字段包含相同的番号）
      const uniqueFoundNumbers = Array.from(new Set(foundNumbers));
      matchedItems.push({ item: item, numbers: uniqueFoundNumbers });
      allExtractedNumbers.push(...uniqueFoundNumbers);
    } else {
      unmatchedItems.push(item);
    }
  });

  // 查找所有提取到的番号中的重复项
  const duplicateNumbers: string[] = [];
  const numberCounts = new Map<string, number>();

  allExtractedNumbers.forEach((num) => {
    numberCounts.set(num, (numberCounts.get(num) || 0) + 1);
  });

  for (const [num, count] of numberCounts.entries()) {
    if (count > 1) {
      duplicateNumbers.push(num);
    }
  }

  return {
    matchedItems, // 匹配到番号的媒体项及其提取到的番号
    unmatchedItems, // 未匹配到番号的媒体项
    allExtractedNumbers, // 所有提取到的番号（包含重复，用于调试）
    duplicateNumbers // 提取到的番号中重复的番号列表
  };
}
