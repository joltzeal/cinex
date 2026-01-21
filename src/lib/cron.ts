import cron from 'node-cron';
import { taskMovieUpdate } from '@/lib/tasks/movie'; 
import { taskJavbusSubscribeUpdate } from '@/lib/tasks/subscribe';
import { taskDownloadStatusSync } from '@/lib/tasks/download';
import { taskMovieLibraryUpdate } from '@/lib/tasks/media-library';
import { taskMediaScraping } from '@/lib/tasks/scraping';
import { taskForumUpdate } from '@/lib/tasks/forum';


export async function runDownloadStatusSync() {
    await taskDownloadStatusSync();
}
export async function runMediaScraping() {
    await taskMediaScraping();
}
// 媒体库同步任务
export async function runMediaLibrarySync() {
    await taskMovieLibraryUpdate();
}
export async function runJavbusMovieUpdate() {
    console.log('手动触发JAVBus影片更新');
    await taskMovieUpdate();
}
// JAVBus订阅增量更新任务
export async function runJavbusSubscribeUpdate() {
    console.log('手动触发JAVBus订阅增量更新');
    await taskJavbusSubscribeUpdate();
}
export async function runForumUpdate() {
    await taskForumUpdate();
}

// TypeScript 全局变量声明，防止开发环境热重载导致任务重复
const globalForScheduler = global as unknown as { isSchedulerStarted: boolean };

export function startScheduler() {
    // 关键检查：如果已经启动过，直接返回
    if (globalForScheduler.isSchedulerStarted) {
        console.log('[Scheduler] 定时任务调度器已在运行中，跳过初始化。');
        return;
    }

    console.log('[Scheduler] 正在启动定时任务调度器...');

    // 1. 设置标志位
    globalForScheduler.isSchedulerStarted = true;

    // 2. 定义 Cron 任务
    const timezone = "Asia/Shanghai";
    
    // 每小时执行一次JAVBus增量更新
    cron.schedule('0 * * * *', runJavbusMovieUpdate, { timezone });
    cron.schedule('0 * * * *', runJavbusSubscribeUpdate, { timezone });

    // 每5分钟执行一次下载状态同步
    cron.schedule('*/5 * * * *', runDownloadStatusSync, { timezone });

    // 每5分钟媒体库同步
    cron.schedule('*/5 * * * *', runMediaLibrarySync, { timezone });
    
    // 每5分钟论坛更新
    cron.schedule('*/5 * * * *', runForumUpdate, { timezone });


    // 3. 应用启动时立即执行一次下载状态同步（优先级更高）
    setTimeout(() => {
        runDownloadStatusSync().catch(error => {
            console.error(`[Scheduler] 启动时下载状态同步任务执行失败: ${error}`);
        });
    }, 1000); // 延迟 1 秒执行，确保应用完全启动
}