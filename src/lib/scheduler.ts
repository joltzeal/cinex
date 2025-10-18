import cron from 'node-cron';
import { taskMovieUpdate } from './tasks/movie';
import { taskJavbusSubscribeUpdate } from './tasks/subscribe';
import { taskDownloadStatusSync } from './tasks/download';
import { taskMovieLibraryUpdate } from './tasks/media-library';
import { taskMediaScraping } from './tasks/scraping';
import { taskForumUpdate } from './tasks/forum';


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


// 启动定时任务
export function startScheduler() {
    console.log('正在启动定时任务调度器...');
    // // 每小时执行一次JAVBus增量更新
    cron.schedule('0 * * * *', runJavbusMovieUpdate, {
        timezone: "Asia/Shanghai" // 设置时区为北京时间
    });
    cron.schedule('0 * * * *', runJavbusSubscribeUpdate, {
        timezone: "Asia/Shanghai" // 设置时区为北京时间
    });

    // 每5分钟执行一次下载状态同步
    cron.schedule('*/5 * * * *', runDownloadStatusSync, {
        timezone: "Asia/Shanghai" // 设置时区为北京时间
    });

    cron.schedule('*/5 * * * *', runMediaLibrarySync, {
        timezone: "Asia/Shanghai" // 设置时区为北京时间
    });

    cron.schedule('*/5 * * * *', runForumUpdate, {
        timezone: "Asia/Shanghai" // 设置时区为北京时间
    });



    // 应用启动时立即执行一次下载状态同步（优先级更高）
    console.log('应用启动，立即执行一次下载状态同步');
    setTimeout(() => {
        runDownloadStatusSync().catch(error => {
            console.log(`启动时下载状态同步任务执行失败: ${error}`, 'error');
        });
    }, 1000); // 延迟 1 秒执行，确保应用完全启动
}


