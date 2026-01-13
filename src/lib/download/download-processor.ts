// src/lib/download-processor.ts
import { WhatslinkPreview, PreviewResponse } from "@/lib/magnet/link-preview";
import { isMagnetLink, ensureMagnetLink } from "@/lib/magnet/magnet-helper";
// import { uploadImages } from "@/lib/image-uploader";
import { Magnet, MustRule, SortRule, TierRule } from "@/types/javbus";

export interface DownloadUrlData {
  url: string;
  detail: PreviewResponse | null;
}

export interface ProcessedData {
  documentTitle: string;
  documentImages: string[];
  downloadUrlData: DownloadUrlData[];
}

/**
 * 处理磁力链接预览
 */
export async function processMagnetLinks(urls: string[]): Promise<{ url: string; preview: PreviewResponse }[]> {
  const magnetLinksOrHashes = urls.filter(isMagnetLink);
  if (magnetLinksOrHashes.length === 0) {
    return [];
  }

  const previewer = new WhatslinkPreview();
  const successfulPreviews: { url: string; preview: PreviewResponse }[] = [];

  for (const linkOrHash of magnetLinksOrHashes) {
    const fullMagnetLink = ensureMagnetLink(linkOrHash);
    const preview = await previewer.getPreview(fullMagnetLink);
    successfulPreviews.push({ url: fullMagnetLink, preview });
  }

  return successfulPreviews;
}

/**
 * 提取图片从预览数据
 */
function extractImagesFromPreviews(previews: { url: string; preview: PreviewResponse }[]): string[] {
  if (previews.length === 0) {
    return [];
  }

  if (previews.length === 1) {
    const firstPreview = previews[0].preview;
    if (firstPreview.screenshots && firstPreview.screenshots.length > 0) {
      return firstPreview.screenshots.map(s => s.screenshot);
    }
  } else {
    return previews
      .map(item => item.preview.screenshots?.[0]?.screenshot)
      .filter((img): img is string => !!img);
  }

  return [];
}

/**
 * 构建下载URL数据
 */
function buildDownloadUrlData(
  allUrls: string[],
  successfulPreviews: { url: string; preview: PreviewResponse }[]
): DownloadUrlData[] {
  const downloadUrlData: DownloadUrlData[] = [];

  // 添加有预览的磁力链接
  for (const item of successfulPreviews) {
    downloadUrlData.push({ url: item.url, detail: item.preview });
  }

  // 添加没有预览的URL（非磁力链接或预览失败的磁力链接）
  const processedUrls = new Set(successfulPreviews.map(item => item.url));
  for (const url of allUrls) {
    if (!processedUrls.has(url)) {
      downloadUrlData.push({ url, detail: null });
    }
  }

  return downloadUrlData;
}

/**
 * 处理手动模式（有自定义标题）
 */
export async function processManualMode(
  allUrls: string[],
  customTitle: string,
  customImages: File[]
): Promise<ProcessedData> {
  const downloadUrlData: DownloadUrlData[] = [];
  let documentImages: string[] = [];

  // 处理自定义图片上传
  if (customImages.length > 0) {
    // documentImages = await uploadImages(customImages);
  } else {
    // 如果没有自定义图片，尝试从磁力链接中提取图片
    const successfulPreviews = await processMagnetLinks(allUrls);
    documentImages = extractImagesFromPreviews(successfulPreviews);
  }

  // 构建下载URL数据
  const successfulPreviews = await processMagnetLinks(allUrls);
  const urlData = buildDownloadUrlData(allUrls, successfulPreviews);
  downloadUrlData.push(...urlData);

  return {
    documentTitle: customTitle,
    documentImages,
    downloadUrlData
  };
}

/**
 * 处理自动模式（没有自定义标题）
 */
export async function processAutoMode(allUrls: string[]): Promise<ProcessedData> {
  const magnetLinksOrHashes = allUrls.filter(isMagnetLink);
  if (magnetLinksOrHashes.length === 0) {
    throw new Error("未提供有效的磁力链接或哈希以获取信息，请手动填写标题和上传图片。");
  }

  const successfulPreviews = await processMagnetLinks(allUrls);

  if (successfulPreviews.length === 0) {
    throw new Error("无法获取任何磁力链接的预览信息。");
  }

  const documentTitle = successfulPreviews[0].preview.name;
  const documentImages = extractImagesFromPreviews(successfulPreviews);
  const downloadUrlData = buildDownloadUrlData(allUrls, successfulPreviews);

  return {
    documentTitle,
    documentImages,
    downloadUrlData
  };
}

/**
 * 从对象数组中根据ID、必要属性和优先级提取单个对象。
 *
 * @param id 要搜索的ID，例如 "IPZZ-629"。
 * @param requiredProperties 一个可选的属性数组，用于过滤对象。
 *   - 'hasSubtitle': 只包括 hasSubtitle 为 true 的对象。
 *   - 'isHD': 只包括 isHD 为 true 的对象。
 * @param priorities 一个属性数组，定义了返回对象的优先级顺序。
 *   - 'uncensored': 优先返回标题以 "-UC" 结尾的对象。
 *   - 'hasSubtitle': 其次优先返回标题以 "-C" 结尾的对象。
 *   - 'isHD': 在前两者都不满足时，考虑此属性。
 *   - 'numberSize': 当多个对象都满足 'isHD' 时，按此属性降序排序。
 * @param data 要搜索的对象数组。
 * @returns 返回最匹配的对象，如果没有找到则返回 null。
 */
export function extractBestMagnet(
  id: string,
  requiredProperties: Array<'hasSubtitle' | 'isHD'> = [],
  priorities: Array<'uncensored' | 'hasSubtitle' | 'isHD' | 'numberSize'>,
  data: Magnet[]
): Magnet | null {
  // 步骤 1: 修正数据中 hasSubtitle 的 bug
  let correctedData = data.map(item => {
    if (item.title.includes('-UC') || item.title.includes('.无码破解')) {
      return { ...item, hasSubtitle: true };
    }
    return item;
  });

  // 步骤 2: 根据 requiredProperties 过滤数组
  let filteredData = correctedData;
  if (requiredProperties.includes('hasSubtitle')) {
    filteredData = filteredData.filter(item => item.hasSubtitle === true);
  }
  if (requiredProperties.includes('isHD')) {
    filteredData = filteredData.filter(item => item.isHD === true);
  }

  if (filteredData.length === 0) {
    return null;
  }

  // 步骤 3: 根据 priorities 查找最符合的对象
  for (const priority of priorities) {
    if (priority === 'uncensored') {
      const uncensoredMatch = filteredData.find(item => item.title === `${id}-UC`);
      if (uncensoredMatch) {
        return uncensoredMatch;
      }
    }

    if (priority === 'hasSubtitle') {
      const subtitleMatch = filteredData.find(item => item.title === `${id}-C`);
      if (subtitleMatch) {
        return subtitleMatch;
      }
    }

    if (priority === 'isHD') {
      const hdMatches = filteredData.filter(item => item.isHD);
      if (hdMatches.length > 0) {
        // 如果有多个 isHD 的对象，按 numberSize 降序排序并返回最大的一个
        hdMatches.sort((a, b) => (b.numberSize || 0) - (a.numberSize || 0));
        return hdMatches[0];
      }
    }
  }

  // 如果根据优先级没有找到任何匹配项（这种情况理论上在 'isHD' 之后不会发生，除非 filteredData 为空），
  // 但作为备用逻辑，可以返回 filteredData 中的第一个元素或根据 numberSize 排序后的最大者。
  if (filteredData.length > 0) {
    filteredData.sort((a, b) => (b.numberSize || 0) - (a.numberSize || 0));
    return filteredData[0];
  }


  return null;
}