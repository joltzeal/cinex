// import { spawn, ChildProcess } from 'child_process';
// import * as path from 'path';
// import * as fs from 'fs';
// import { PrismaClient } from '@prisma/client';
// import { broadcastMessage, setAppShuttingDown } from './telegram';
// import { logger } from './logger';

// const prisma = new PrismaClient();

// interface BotStatus {
//   running: boolean;
//   configured: boolean;
//   processId?: number;
//   startTime?: string;
//   error?: string;
// }

// interface ServiceResult {
//   success: boolean;
//   message: string;
// }

// // 全局Bot进程管理
// let botProcess: ChildProcess | null = null;
// let botStatus: BotStatus = {
//   running: false,
//   configured: false
// };

// // 关闭状态保护，防止重复关闭
// let isShuttingDown = false;

// // 检查Bot配置是否完整
// async function checkBotConfiguration(): Promise<boolean> {
//   try {
//     const config = await prisma.setting.findUnique({
//       where: { key: 'telegramConfig' }
//     });

//     if (!config || !config.value) {
//       return false;
//     }

//     const { apiId, apiHash, botToken, enabled } = config.value as any;
//     return !!(apiId && apiHash && botToken && enabled);
//   } catch (error) {
//     logger.error(`检查Bot配置失败:${(error as Error).message}`);
//     return false;
//   }
// }

// // 获取Bot状态
// export async function getBotStatus(): Promise<BotStatus> {
//   const configured = await checkBotConfiguration();
  
//   return {
//     ...botStatus,
//     configured
//   };
// }

// // 启动Bot服务
// export async function startBotService(): Promise<ServiceResult> {
//   try {
//     // 检查配置
//     const configured = await checkBotConfiguration();
//     if (!configured) {
//       return {
//         success: false,
//         message: 'Bot配置不完整，请先完成配置'
//       };
//     }

//     // 检查是否已经在运行
//     if (botProcess && !botProcess.killed) {
//       return {
//         success: false,
//         message: 'Bot服务已经在运行中'
//       };
//     }

//     // 启动Bot进程
//     // 在生产环境中，需要从项目根目录定位bot脚本
//     const projectRoot = process.cwd();
//     const botScriptPath = path.resolve(projectRoot, 'src/bot/index.js');
//     logger.info(`启动Bot脚本路径:${botScriptPath}`);
    
//     // 检查文件是否存在
//     if (!fs.existsSync(botScriptPath)) {
//       throw new Error(`Bot脚本文件不存在: ${botScriptPath}`);
//     }

//     botProcess = spawn('node', [botScriptPath], {
//       stdio: ['pipe', 'pipe', 'pipe'],
//       env: {
//         ...process.env,
//         NODE_ENV: process.env.NODE_ENV || 'production'
//       },
//       detached: false
//     });

//     // 设置进程状态
//     botStatus = {
//       running: true,
//       configured: true,
//       processId: botProcess.pid,
//       startTime: new Date().toISOString()
//     };

//     // 监听进程输出
//     botProcess.stdout?.on('data', (data) => {
//       const message = data.toString().trim();
//       logger.info(`[Bot] ${message}`);
      
//       // 广播重要消息到前端
//       if (message.includes('✅') || message.includes('📨') || message.includes('⬇️')) {
//         broadcastMessage({
//           type: 'bot_log',
//           message: message,
//           level: 'info'
//         });
//       }
//     });

//     botProcess.stderr?.on('data', (data) => {
//       const message = data.toString().trim();
//       logger.error(`[Bot Error] ${message}`);
      
//       // 广播错误消息
//       broadcastMessage({
//         type: 'bot_log',
//         message: message,
//         level: 'error'
//       });
//     });

//     // 监听进程退出
//     botProcess.on('exit', (code, signal) => {
//       logger.info(`Bot进程退出: code=${code}, signal=${signal}`);
//       botStatus = {
//         running: false,
//         configured: botStatus.configured,
//         error: code !== 0 ? `进程异常退出，退出码: ${code}` : undefined
//       };

//       // 广播进程退出消息
//       broadcastMessage({
//         type: 'bot_status',
//         status: 'stopped',
//         message: `Bot进程已退出 (code: ${code})`
//       });

//       botProcess = null;
//     });

//     botProcess.on('error', (error) => {
//       logger.error(`Bot进程错误:${(error as Error).message}`);
//       botStatus = {
//         running: false,
//         configured: botStatus.configured,
//         error: error.message
//       };

//       // 广播错误消息
//       broadcastMessage({
//         type: 'bot_status',
//         status: 'error',
//         message: `Bot启动失败: ${error.message}`
//       });

//       botProcess = null;
//     });

//     // 广播启动消息
//     broadcastMessage({
//       type: 'bot_status',
//       status: 'started',
//       message: 'Bot服务已启动'
//     });

//     return {
//       success: true,
//       message: `Bot服务已启动，进程ID: ${botProcess.pid}`
//     };

//   } catch (error) {
//     logger.error(`启动Bot服务失败:${(error as Error).message}`);
//     botStatus = {
//       running: false,
//       configured: botStatus.configured,
//       error: (error as Error).message
//     };

//     return {
//       success: false,
//       message: `启动失败: ${(error as Error).message}`
//     };
//   }
// }

// // 停止Bot服务
// export async function stopBotService(): Promise<ServiceResult> {
//   try {
//     if (!botProcess || botProcess.killed) {
//       botStatus.running = false;
//       return {
//         success: true,
//         message: 'Bot服务未在运行'
//       };
//     }

//     // 尝试优雅关闭
//     botProcess.kill('SIGTERM');

//     // 等待一段时间后强制关闭
//     setTimeout(() => {
//       if (botProcess && !botProcess.killed) {
//         logger.info('强制关闭Bot进程');
//         botProcess.kill('SIGKILL');
//       }
//     }, 5000);

//     botStatus.running = false;
//     botStatus.processId = undefined;
//     botStatus.startTime = undefined;
//     botStatus.error = undefined;

//     // 只有在非关闭状态下才广播停止消息
//     if (!isShuttingDown) {
//       broadcastMessage({
//         type: 'bot_status',
//         status: 'stopped',
//         message: 'Bot服务已停止'
//       });
//     }

//     return {
//       success: true,
//       message: 'Bot服务已停止'
//     };

//   } catch (error) {
//     logger.error(`停止Bot服务失败:${(error as Error).message}`);
//     return {
//       success: false,
//       message: `停止失败: ${(error as Error).message}`
//     };
//   }
// }

// // 重启Bot服务
// export async function restartBotService(): Promise<ServiceResult> {
//   try {
//     logger.info('正在重启Bot服务...');
    
//     // 先停止
//     const stopResult = await stopBotService();
//     if (!stopResult.success) {
//       return stopResult;
//     }

//     // 等待一段时间确保进程完全停止
//     await new Promise(resolve => setTimeout(resolve, 2000));

//     // 再启动
//     const startResult = await startBotService();
    
//     if (startResult.success) {
//       // 广播重启消息
//       broadcastMessage({
//         type: 'bot_status',
//         status: 'restarted',
//         message: 'Bot服务已重启'
//       });
//     }

//     return startResult;

//   } catch (error) {
//     logger.error(`重启Bot服务失败:${error}`);
//     return {
//       success: false,
//       message: `重启失败: ${(error as Error).message}`
//     };
//   }
// }

// // 应用启动时自动启动Bot（根据配置）
// export async function autoStartBotOnAppStart(): Promise<void> {
//   try {
//     logger.info('检查是否需要自动启动Bot服务...');
    
//     const config = await prisma.setting.findUnique({
//       where: { key: 'telegramConfig' }
//     });

//     if (!config || !config.value) {
//       logger.info('未找到Telegram配置，跳过自动启动');
//       return;
//     }

//     const { enabled } = config.value as any;
//     if (!enabled) {
//       logger.info('Telegram功能未启用，跳过自动启动');
//       return;
//     }

//     logger.info('配置显示已启用，准备自动启动Bot服务...');
//     const result = await startBotService();
    
//     if (result.success) {
//       logger.info('✅ Bot服务自动启动成功');
//     } else {
//       logger.info(`❌ Bot服务自动启动失败:${result.message}`);
//     }

//   } catch (error) {
//     logger.error(`自动启动Bot服务时出错:${(error as Error).message}`);
//   }
// }

// // 优雅关闭所有服务
// export async function gracefulShutdown(): Promise<void> {
//   // 防止重复关闭
//   if (isShuttingDown) {
//     return;
//   }
  
//   isShuttingDown = true;
//   setAppShuttingDown(true); // 设置全局关闭状态
//   logger.info('正在优雅关闭Bot管理器...');
  
//   try {
//     if (botProcess && !botProcess.killed) {
//       await stopBotService();
//     }
    
//     await prisma.$disconnect();
//   } catch (error) {
//     logger.error(`关闭过程中出现错误:${(error as Error).message}`);
//   }
// }

// // 监听进程退出信号 - 只注册必要的信号处理器
// // SIGTERM: 优雅关闭信号
// // SIGINT: Ctrl+C 中断信号
// // 移除 beforeExit 避免重复触发
// process.on('SIGTERM', gracefulShutdown);
// process.on('SIGINT', gracefulShutdown);
