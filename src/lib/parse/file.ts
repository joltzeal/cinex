import * as fs from 'fs';
import * as path from 'path';
import { videoExtensions as videoExtensionsArray } from '@/constants/data';
/**
 * 遍历指定文件夹，根据规则过滤文件，返回符合条件的视频文件路径数组。
 *
 * @param folderPath 要遍历的文件夹路径。
 * @param cleanupExtensions 要过滤掉的文件扩展名，以'|'分隔，例如：'.html|.url'。
 * @param cleanupFilenameContains 要过滤掉的文件名包含的关键词，以'|'分隔。
 * @param cleanupMinFileSize 最小文件大小（MB），小于此大小的文件将被过滤。
 * @returns 返回一个包含所有符合规则的视频文件路径的字符串数组。
 */
export async function findVideoFiles(
  folderPath: string,
  cleanupExtensions: string,
  cleanupFilenameContains: string,
  cleanupMinFileSize: number = 100
): Promise<string[]> {
  const videoExtensions = new Set(videoExtensionsArray);
  const cleanupExts = new Set(cleanupExtensions.split('|'));
  const cleanupKeywords = cleanupFilenameContains.split('|');
  const minFileSizeBytes = cleanupMinFileSize * 1024 * 1024;

  const allFiles: string[] = [];

  async function traverseDir(currentPath: string) {
    try {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        if (entry.isDirectory()) {
          await traverseDir(fullPath);
        } else {
          allFiles.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${currentPath}:`, error);
    }
  }

  await traverseDir(folderPath);

  const filteredFiles = allFiles.filter(filePath => {
    const fileExt = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);

    // 1. 过滤掉指定扩展名的文件
    if (cleanupExts.has(fileExt)) {
      return false;
    }

    // 2. 过滤掉文件名包含指定关键词的文件
    if (cleanupKeywords.some(keyword => fileName.includes(keyword))) {
      return false;
    }

    try {
      const stats = fs.statSync(filePath);
      // 3. 过滤掉小于指定大小的文件
      if (stats.size < minFileSizeBytes) {
        return false;
      }
    } catch (error) {
      console.error(`Error getting stats for file ${filePath}:`, error);
      return false;
    }

    // 4. 过滤非视频文件
    if (!videoExtensions.has(fileExt)) {
      return false;
    }

    return true;
  });

  return filteredFiles;
}
