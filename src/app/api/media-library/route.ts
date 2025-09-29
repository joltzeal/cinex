import { NextResponse } from 'next/server';
import { JellyfinClient, JellyfinConfig, JellyfinMediaItem } from '@/lib/jellyfin-client';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client'; // 导入 Prisma


export async function GET(request: Request) {
  try {
    console.log('[API Sync] Starting Jellyfin library sync...');
    const subscribeList = await db.subscribeData.findMany({
      where: { status: { not: 'added' } },
      select: { id: true, title: true, code: true }
    });
    if (subscribeList.length === 0) {
      return NextResponse.json({ message: 'No subscriptions to sync.' });
    }
    const JELLYFIN_CONFIG = await db.setting.findUnique({where: {key: 'mediaServerConfig'}}) as any;
    if (!JELLYFIN_CONFIG) {
      return NextResponse.json({ error: 'Jellyfin config not found.' });
    }
    const client = new JellyfinClient(JELLYFIN_CONFIG?.value as JellyfinConfig);
    const libraries = await client.getMediaLibraries();
    let allMediaItems: JellyfinMediaItem[] = [];
    for (const library of libraries) {
      // 我们只关心 "collectionType": "movies" 或 "tvshows" 的库
      // Jellyfin API 返回的 Type 是 'CollectionFolder'
      console.log(`[API Sync] Scanning library "${library.Name}"...`);
      const itemsInLibrary = await client.getAllItemsRecursive(library.Id);
      allMediaItems.push(...itemsInLibrary);
    }

    // --- 2. 核心匹配逻辑 (重构以存储匹配的媒体项) ---
    // 🔥 key: 数据库主键ID, value: 匹配到的 Jellyfin 媒体项
    const matchesToUpdate = new Map<string, JellyfinMediaItem>();

    console.log('[API Sync] Starting Pass 1: Matching by Source ID...');
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
    console.log(`[API Sync] Pass 1 complete. Matched ${matchedByIdCount} items by Source ID.`);

    console.log('[API Sync] Starting Pass 2: Matching by Title for remaining items...');
    let matchedByTitleCount = 0;
    const remainingSubscriptions = subscribeList.filter(s => !matchesToUpdate.has(s.id));

    if (remainingSubscriptions.length > 0 && allMediaItems.length > 0) {
      const jellyfinTitleToItemMap = new Map<string, JellyfinMediaItem>();
      allMediaItems.forEach(item => jellyfinTitleToItemMap.set(item.Name.toLowerCase(), item));
      
      remainingSubscriptions.forEach(sub => {
          const subTitleLower = sub.title.toLowerCase();
          let isFound = false;
          // 使用 forEach 遍历 Map 的 entries
          jellyfinTitleToItemMap.forEach((mediaItem, jellyfinTitle) => {
              if(isFound) return;
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
    console.log(`[API Sync] Pass 2 complete. Matched ${matchedByTitleCount} additional items by Title.`);

    // --- 3. 数据库更新逻辑 (重构为事务) ---
    if (matchesToUpdate.size > 0) {
      console.log(`[API Sync] Preparing to update ${matchesToUpdate.size} records in a transaction...`);
      
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
      console.log(`[API Sync] Transaction complete. ${matchesToUpdate.size} records updated.`);
    } else {
      console.log('[API Sync] No new matches found. No database updates needed.');
    }

    return NextResponse.json({
      message: 'Sync process completed successfully.',
      matchedById: matchedByIdCount,
      matchedByTitle: matchedByTitleCount,
      totalUpdated: matchesToUpdate.size,
    });

  } catch (error: any) {
    console.error('[API Sync] An error occurred during Jellyfin sync:', error);
    return NextResponse.json({ error: 'Failed to sync with Jellyfin.', details: error.message }, { status: 500 });
  }
}