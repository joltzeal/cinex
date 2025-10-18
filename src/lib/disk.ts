import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger';

const execAsync = promisify(exec);

export interface StorageInfo {
  total: string;
  used: string;
  percentage: number;
}

export async function getStorageInfo(path: string): Promise<StorageInfo> {
  try {
    // 使用 df -h 命令来获取人类可读的磁盘使用情况
    const { stdout } = await execAsync(`df -h ${path}`);
    
    // 解析命令的输出
    const lines = stdout.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('无法解析 df 命令的输出');
    }

    const data = lines[1].split(/\s+/);
    if (data.length < 5) {
      throw new Error('无法解析 df 命令的输出格式');
    }

    const total = data[1]; // 总空间
    const used = data[2]; // 已用空间
    const percentage = parseInt(data[4].replace('%', ''), 10); // 使用百分比

    return {
      total,
      used,
      percentage,
    };
  } catch (error) {
    logger.error(`获取存储信息时出错:${error}`, );
    // 在开发环境中或无法获取真实数据时返回模拟数据
    return {
      total: 'N/A',
      used: 'N/A',
      percentage: 0,
    };
  }
}