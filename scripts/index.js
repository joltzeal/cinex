#!/usr/bin/env node

const cron = require('node-cron');
const http = require('http');
const path = require('path');
const fs = require('fs');

// 任务执行状态跟踪
const taskStatus = {
  movieUpdate: false,
  subscribeUpdate: false,
  mediaLibraryUpdate: false,
  downloaderUpdate: false,
  forumUpdate: false,

};


// 配置
const CONFIG = {
  
  
  // Cron 表达式配置
  schedules: {
    // 每6小时半点 06:30 12:30 18:30 00:30 执行
    movieUpdate: '30 */6 * * *',
    
    // 每12小时 12:00 00:00 执行
    subscribeUpdate: '0 */12 * * *',
    
    // 每5分钟执行媒体库同步（错开时间）
    mediaLibraryUpdate: '*/10 * * * *',

    // 每10分钟的第5分钟执行下载状态同步
    downloaderUpdate: '*/5 * * * *',

    forumUpdate: '*/10 * * * *',
  }
};

function healthCheck() {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:3000/api/health`;
    const request = http.get(url, (response) => {
      resolve(response.statusCode);

    });
    request.on('error', (error) => {
      reject(error);
    });
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('请求超时'));
    });
  });
}



// 安全执行任务的包装函数
async function executeTask(taskName, taskType) {
  if (taskStatus[taskName]) {
    console.log(`[${new Date().toISOString()}] 跳过任务 ${taskName}：上一次执行仍在进行中`);
    return;
  }

  taskStatus[taskName] = true;
  const startTime = Date.now();
  
  try {
    console.log(`[${new Date().toISOString()}] 开始执行任务: ${taskName}`);
    await makeRequest(taskType);
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] 任务 ${taskName} 执行完成，耗时: ${duration}ms`);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${new Date().toISOString()}] 任务 ${taskName} 执行失败，耗时: ${duration}ms，错误:`, error.message);
  } finally {
    taskStatus[taskName] = false;
  }
}

// HTTP 请求函数
function makeRequest(taskType) {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:3000/api/scheduler/run-task`;
    const postData = JSON.stringify({
      taskType: taskType
    });
    
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const request = http.request(url, options, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {        
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve({
            taskType,
            statusCode: response.statusCode,
            data: data
          });
        } else {
          reject(new Error(`HTTP ${response.statusCode}: ${data}`));
        }
      });
    });
    
    request.on('error', (error) => {
      console.error(`[${new Date().toISOString()}] 请求错误 ${taskType}:`, error.message);
      reject(error);
    });
    
    // 设置请求超时
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('请求超时'));
    });
    
    // 发送 POST 数据
    request.write(postData);
    request.end();
  });
}

// 等待 Next.js 启动
async function waitForNextjs() {
  const maxRetries = 30;
  const retryDelay = 2000; // 2秒
  
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await healthCheck();
      return true;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  throw new Error('Next.js 应用启动超时');
}

// 创建 cron 任务
function createCronJobs() {
  // movie 同步任务
  cron.schedule(CONFIG.schedules.movieUpdate, async () => {
    await executeTask('movieUpdate', 'javbus-movie-update');
  });
  
  // subscribe 同步任务
  cron.schedule(CONFIG.schedules.subscribeUpdate, async () => {
    await executeTask('subscribeUpdate', 'javbus-subscribe-update');
  });
  
  // media library 同步任务
  cron.schedule(CONFIG.schedules.mediaLibraryUpdate, async () => {
    await executeTask('mediaLibraryUpdate', 'media-library-sync');
  });

  // 下载器同步
  cron.schedule(CONFIG.schedules.downloaderUpdate, async () => {
    await executeTask('downloaderUpdate', 'download-status-sync');
  });

  cron.schedule(CONFIG.schedules.forumUpdate, async () => {
    await executeTask('forumUpdate', 'forum-update');
  });
  
  // console.log(`- 电影更新任务: ${CONFIG.schedules.movieUpdate}`);
  // console.log(`- 订阅更新任务: ${CONFIG.schedules.subscribeUpdate}`);
  // console.log(`- 媒体库同步任务: ${CONFIG.schedules.mediaLibraryUpdate}`);
  // console.log(`- 下载状态同步任务: ${CONFIG.schedules.downloaderUpdate}`);
}



// 优雅关闭处理
async function gracefulShutdown() {
  console.log('正在优雅关闭所有服务...');
  
  console.log('所有服务已关闭');
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// 主函数
async function main() {
  try {
    await waitForNextjs();
    createCronJobs();
    // 保持进程运行
    setInterval(() => {
      // 心跳日志（可选）
      // console.log(`[${new Date().toISOString()}] 调度器运行中...`);
    }, 60000); // 每分钟

  } catch (error) {
    console.error('调度器启动失败:', error);
    process.exit(1);
  }
}

// 启动
main();