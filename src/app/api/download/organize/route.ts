import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { AIFolderResult, getBatchClassificationInfo } from '@/lib/ai-provider';
import { getSetting, SettingKey } from '@/services/settings';



// --- POST 函数现在包含文件移动逻辑 ---
export async function POST(req: NextRequest) {

  try {
    const aiConfig = await getSetting(SettingKey.AiProviderConfig);
    if (!aiConfig) {
      return NextResponse.json({ error: 'AI Provider尚未配置，请前往设置页面进行配置。' }, { status: 500 });
    }
    
    const { rootDir } = await req.json();
    if (!rootDir || typeof rootDir !== 'string') {
      return NextResponse.json({ error: '需要提供 rootDir 参数' }, { status: 400 });
    }

    // 检查根目录是否存在
    try {
      await fs.access(rootDir);
    } catch (error) {
      return NextResponse.json({ error: `指定的根目录不存在: ${rootDir}` }, { status: 404 });
    }

    const items = await fs.readdir(rootDir, { withFileTypes: true });
    const folders = items.filter((item) => item.isDirectory()).map((item) => item.name);

    if (folders.length === 0) {
      return NextResponse.json({ message: '指定目录下没有找到任何文件夹。', results: [] });
    }

    console.log(`正在向 AI 发送 ${folders.length} 个文件夹进行批量分析...`);
    const aiResults = await getBatchClassificationInfo(folders);
    console.log('AI 批量分析完成。');

    const resultMap = new Map<string, AIFolderResult>(
      aiResults.map(res => [res.originalName, res])
    );

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    // 使用 Promise.all 并行处理所有文件夹的移动操作
    const processingPromises = folders.map(async (folderName) => {
      const aiData = resultMap.get(folderName);

      // --- Fallback 逻辑 ---
      if (!aiData) {
        skippedCount++;
        const reason = `文件夹 "${folderName}" 未能从 AI 获得分析结果，已跳过。`;
        console.warn(`⚠️ SKIPPED: ${reason}`);
        return {
          oldName: folderName,
          status: 'skipped',
          reason: reason,
        };
      }

      // --- 核心路径构建和文件操作逻辑 ---
      const { categories, sourceCategory, personName } = aiData;
      const oldPath = path.join(rootDir, folderName);
      let targetDir: string;
      let directoryStructure: string[];

      if (personName && typeof personName === 'string' && personName.trim() !== '') {
        targetDir = path.join(rootDir, sourceCategory, personName);
        directoryStructure = [sourceCategory, personName];
      } else {
        targetDir = path.join(rootDir, sourceCategory);
        directoryStructure = [sourceCategory];
      }

      const finalPath = path.join(targetDir, folderName);

      // *** 实际文件操作 ***
      try {
        // 1. 确保目标目录存在
        await fs.mkdir(targetDir, { recursive: true });

        // 2. 移动文件夹
        await fs.rename(oldPath, finalPath);

        successCount++;
        console.log(`✅ SUCCESS: Moved ${oldPath} -> ${finalPath}`);
        return {
          oldName: folderName,
          finalPath,
          tags: categories,
          directoryStructure,
          status: 'moved',
        };
      } catch (moveError: any) {
        failCount++;
        console.error(`❌ FAILED to move ${folderName}: ${moveError.message}`);
        return {
          oldName: folderName,
          finalPath,
          tags: categories,
          directoryStructure,
          status: 'failed',
          error: moveError.message,
        };
      }
    });

    const results = await Promise.all(processingPromises);

    const message = `整理完成！成功移动 ${successCount} 个, 失败 ${failCount} 个, 跳过 ${skippedCount} 个。`;
    return NextResponse.json({ message, results });

  } catch (error: any) {
    console.error('服务器错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}


