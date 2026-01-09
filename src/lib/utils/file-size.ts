/**
 * 文件大小转换工具函数
 * 用于统一处理各种文件大小格式的转换
 */

/**
 * 将文件大小字符串 (如 "5.75GB", "100MB") 转换为字节数
 * @param sizeString - 要转换的文件大小字符串
 * @returns 返回字节数（number），如果输入无效则返回 null
 * @example
 * convertSizeToBytes("5.75GB") // 6171009638.4
 * convertSizeToBytes("100MB")  // 104857600
 * convertSizeToBytes("1.5KB")  // 1536
 */
export function convertSizeToBytes(
  sizeString: string | null | undefined
): number | null {
  if (!sizeString) {
    return null;
  }

  // 使用正则表达式分离数字和单位，不区分大小写
  // 支持的单位: B, KB, MB, GB, TB, PB
  const match = sizeString.trim().match(/^(\d+(\.\d+)?)\s*(PB|TB|GB|MB|KB|B)/i);

  if (!match) {
    return null;
  }

  const value = parseFloat(match[1]); // 提取数字部分, e.g., 5.75
  const unit = match[3].toUpperCase(); // 提取单位并转为大写, e.g., GB

  const KILO = 1024;

  switch (unit) {
    case 'PB':
      return value * Math.pow(KILO, 5);
    case 'TB':
      return value * Math.pow(KILO, 4);
    case 'GB':
      return value * Math.pow(KILO, 3);
    case 'MB':
      return value * Math.pow(KILO, 2);
    case 'KB':
      return value * KILO;
    case 'B':
      return value;
    default:
      return null;
  }
}

/**
 * 将字节数转换为人类可读的文件大小字符串
 * @param bytes - 字节数
 * @param decimals - 小数位数，默认为 2
 * @returns 格式化后的文件大小字符串
 * @example
 * formatBytes(1024) // "1.00 KB"
 * formatBytes(1536, 0) // "2 KB"
 * formatBytes(1234567890) // "1.15 GB"
 */
export function formatBytes(
  bytes: number | null | undefined,
  decimals: number = 2
): string {
  if (!bytes || bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * 比较两个文件大小字符串
 * @param size1 - 第一个文件大小字符串
 * @param size2 - 第二个文件大小字符串
 * @returns 如果 size1 > size2 返回正数，相等返回 0，size1 < size2 返回负数
 * @example
 * compareSizes("1GB", "500MB") // > 0
 * compareSizes("100MB", "1GB") // < 0
 */
export function compareSizes(size1: string, size2: string): number {
  const bytes1 = convertSizeToBytes(size1) ?? 0;
  const bytes2 = convertSizeToBytes(size2) ?? 0;
  return bytes1 - bytes2;
}
