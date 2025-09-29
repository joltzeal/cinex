// 导入 Node.js 内置模块
const fs = require('fs');
const path = require('path');

// 导入第三方依赖
const chokidar = require('chokidar');

// --- 请根据您的项目结构调整以下模块的导入路径 ---
const { db } = require('./utils/db'); // 假设 db 从这里导入
const { loadModules } = require('./utils/loadModules'); // 假设 loadModules 从这里导入
const { getFileInfo } = require('./services/fileInfo'); // 假设 getFileInfo 从这里导入
const { monitorTransfer } = require('./services/transfer'); // 假设 monitorTransfer 从这里导入
// ----------------------------------------------------

async function startFileWatcher() {
  console.log('[File-Watcher] 目录监控运行中');

  // 先加载必要的模块
  await loadModules();

  const downloadDirectoryConfig = await db.setting.findUnique({
    where: { key: 'downloadDirectoryConfig' }
  });

  console.log(downloadDirectoryConfig?.value);

  if (!downloadDirectoryConfig?.value) {
    console.log('[File-Watcher] 下载目录配置未找到');
    return;
  }
  let dirs = [];
  // 确保 downloadDirectoryConfig.value 是一个可迭代的对象
  if (typeof downloadDirectoryConfig.value === 'object' && downloadDirectoryConfig.value !== null) {
    Object.values(downloadDirectoryConfig.value).forEach((directory) => {
      if (directory.mediaType === 'movie' && directory.downloadDir) {
        const downloadsDir = path.join(process.cwd(), directory.downloadDir);
        // 确保目录存在
        if (fs.existsSync(downloadsDir)) {
          dirs.push(downloadsDir);
        } else {
          console.warn(`[File-Watcher] 目录不存在，已跳过：${downloadsDir}`);
        }
      }
    });
  }

  if (dirs.length === 0) {
    console.log('[File-Watcher] 没有需要监控的有效目录');
    return;
  }

  console.log('[File-Watcher] 正在监控以下目录:', dirs);

  const watcher = chokidar.watch(dirs, {
    ignored: /(^|[\/\\])\../, // 忽略点文件 (例如 .DS_Store)
    persistent: true,
    ignoreInitial: true, // 忽略初始扫描时已存在的文件
    awaitWriteFinish: { // 等待文件写入完成
      stabilityThreshold: 2000,
      pollInterval: 100,
    },
  });

  watcher
    .on('add', async (filePath) => {
      // 忽略 qBittorrent 的临时文件
      if (filePath.endsWith('!qB')) {
        console.log(`[File-Watcher] 忽略下载中的文件: ${filePath}`);
        return;
      }

      // 假设视频文件后缀
      const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv'];
      const fileExt = path.extname(filePath).toLowerCase();

      if (videoExtensions.includes(fileExt)) {
        fs.stat(filePath, (err, stats) => {
          if (err) {
            console.error(`[File-Watcher] 无法获取文件状态: ${filePath}`, err);
            return;
          }

          const fileSizeInMB = stats.size / (1024 * 1024);
          if (fileSizeInMB > 100) {
            console.log(`[File-Watcher] 检测到新的大于100MB的视频文件: ${filePath}`);
            getFileInfo(filePath).then(
              (fileInfo) => {
                console.log(fileInfo);
                if (fileInfo.number && fileInfo.letters) {
                  monitorTransfer(filePath, fileInfo.number).then(
                    () => {
                      console.log(`[File-Watcher] 转移成功: ${filePath}`);
                    }
                  ).catch(
                    (error) => {
                      console.log(`[File-Watcher] 转移失败: ${filePath}`, error);
                    }
                  );
                }
              }
            );

            // 在这里添加你想要执行的逻辑，例如：
            // - 将文件信息写入数据库
            // - 触发媒体库扫描等
            // processNewVideoFile(filePath);
          } else {
            console.log(`[File-Watcher] 文件大小未超过100MB，已忽略: ${filePath}`);
          }
        });
      }
    })
    .on('error', (error) => console.error(`[File-Watcher] 发生错误: ${error}`))
    .on('ready', () => console.log('[File-Watcher] 初始扫描完成，准备好监控文件改动'));

  watcher.on('error', (error) => console.error(`[File-Watcher] 发生错误: ${error.message}`));
  watcher.on('ready', () => console.log('[File-Watcher] 文件监听器已启动，正在等待新文件事件...'));
}

// 导出函数，以便在其他文件中使用
module.exports = {
  startFileWatcher
};