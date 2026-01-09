// src/lib/magnet-helper.ts
import { Magnet } from '@/types/javbus';
import * as magnet from 'magnet-uri'; // 使用命名空间导入

/**
 * 从磁力链接中提取哈希值
 * @param magnetUrl 磁力链接
 * @returns 40位十六进制哈希值，如果不是磁力链接则返回null
 */
export function extractHashFromMagnet(magnetUrl: string): string | null {
  try {
    // 解析磁力链接
    const parsed = magnet.decode(magnetUrl);

    // 获取哈希值（可能是数组或字符串）
    const hash = parsed.infoHash;

    if (hash) {
      // 确保返回40位十六进制字符串
      return hash.toString().toLowerCase();
    }

    return null;
  } catch (error) {
    console.error('解析磁力链接失败:', error);
    return null;
  }
}

/**
 * 检查字符串是否为磁力链接
 * @param url 要检查的字符串
 * @returns 是否为磁力链接
 */
export function isMagnetLink(url: string): boolean {
  return url.startsWith('magnet:?xt=urn:btih:');
}

/**
 * 从URL中提取哈希值（支持磁力链接和纯哈希）
 * @param url 磁力链接或40位哈希值
 * @returns 40位十六进制哈希值，如果无法提取则返回null
 */
export function extractHash(url: string): string | null {
  // 如果是磁力链接
  if (isMagnetLink(url)) {
    return extractHashFromMagnet(url);
  }

  // 如果是40位十六进制字符串
  if (/^[a-fA-F0-9]{40}$/.test(url)) {
    return url.toLowerCase();
  }

  return null;
}

/**
 * 标准化磁力链接
 * @param url 磁力链接或哈希值
 * @returns 完整的磁力链接
 */
export function normalizeMagnetLink(url: string): string {
  const hash = extractHash(url);
  if (hash) {
    return `magnet:?xt=urn:btih:${hash}`;
  }
  return url;
}

/**
 * 确保链接是完整的磁力链接
 * @param linkOrHash 磁力链接或哈希值
 * @returns 完整的磁力链接
 */
export function ensureMagnetLink(linkOrHash: string): string {
  if (linkOrHash.startsWith('magnet:?xt=urn:btih:')) {
    return linkOrHash;
  }
  if (/^[a-fA-F0-9]{40}$/.test(linkOrHash)) {
    return `magnet:?xt=urn:btih:${linkOrHash}`;
  }
  return linkOrHash; // 如果都不是，原样返回
}

/**
 * 合并两个磁力链接数组，确保唯一性。
 * 函数会保留 'a' 数组中的所有项目。
 * 然后，它会添加 'b' 数组中那些 'id' (磁力哈希) 不存在于 'a' 数组中的项目。
 *
 * @param a - 主数组。此数组中的所有磁力链接都会被保留。
 * @param b - 次数组。此数组中的磁力链接将被过滤和添加。
 * @returns 返回一个新的合并后的数组，以 'a' 为基础，并附加了 'b' 中的唯一项。
 */
export function mergeMagnetArrays(a: Magnet[], b: Magnet[]): Magnet[] {
  // 步骤 1: 创建一个包含数组 'a' 中所有磁力哈希的 Set，以便进行高效查找。
  // 这比在循环中反复调用 a.find() 或 a.some() 性能要好得多。
  const hashesInA = new Set(a.map((magnet) => magnet.id));

  // 步骤 2: 过滤数组 'b'，只保留那些哈希值不在 hashesInA 中的磁力链接。
  const uniqueMagnetsFromB = b.filter((magnetB) => !hashesInA.has(magnetB.id));

  // 步骤 3: 使用展开语法 (...) 将原始数组 'a' 和过滤后的 'b' 数组合并。
  // 这会返回一个全新的数组，不会修改原始的 a 或 b 数组。
  return [...a, ...uniqueMagnetsFromB];
}
/**
 * 提取文本中的磁力链接
 * @param text - 文本
 * @returns 返回一个包含磁力链接的数组。
 */
export function extractMagnetLinks(text: string): string[] {
  // 1. 匹配完整的磁力链接（带协议头）
  const magnetRegex =
    /magnet:\?xt=urn:btih:[a-zA-Z0-9]{32,40}(?:[&a-zA-Z0-9=._\-]*)?/gi;
  const fullMagnetMatches = text.match(magnetRegex) || [];

  // 2. 提取所有完整磁力链接中的 hash，用于后续去重
  const existingHashes = new Set<string>();
  fullMagnetMatches.forEach((magnetLink) => {
    const hash = extractHashFromMagnet(magnetLink);
    if (hash) {
      existingHashes.add(hash.toLowerCase());
    }
  });

  // 3. 匹配单独的 32 或 40 位 hash（不在完整磁力链接内部）
  // 使用负向后顾和负向前瞻确保不匹配已经在 magnet:?xt=urn:btih: 后面的 hash
  const standaloneHashRegex =
    /(?<!magnet:\?xt=urn:btih:)\b([a-fA-F0-9]{32}|[a-fA-F0-9]{40})\b/gi;
  const standaloneHashMatches = text.match(standaloneHashRegex) || [];

  // 4. 为单独的 hash 添加协议头（排除已存在的 hash）
  const standaloneHashes = standaloneHashMatches
    .map((hash) => hash.toLowerCase())
    .filter((hash) => !existingHashes.has(hash)) // 避免重复
    .map((hash) => `magnet:?xt=urn:btih:${hash}`);

  // 5. 合并完整磁力链接和转换后的单独 hash，基于 hash 去重
  const allMagnets = [...fullMagnetMatches, ...standaloneHashes];

  // 6. 基于磁力 hash 进行去重，保留第一次出现的完整链接
  const seen = new Set<string>();
  const uniqueMagnets = allMagnets.filter((magnetLink) => {
    const hash = extractHashFromMagnet(magnetLink);
    if (!hash) return false;

    const normalizedHash = hash.toLowerCase();
    if (seen.has(normalizedHash)) {
      return false; // 已经存在，过滤掉
    }

    seen.add(normalizedHash);
    return true; // 第一次出现，保留
  });

  return uniqueMagnets;
}
