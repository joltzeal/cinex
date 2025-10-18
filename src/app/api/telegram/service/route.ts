import { NextRequest, NextResponse } from 'next/server';
// import { getBotStatus, startBotService, stopBotService, restartBotService } from '@/lib/bot-manager';
import telegramBot from '@/lib/bot'; // Import the singleton instance
import { logger } from '@/lib/logger';

// GET - 获取Bot状态
export async function GET(request: NextRequest) {
  try {
    const status = telegramBot.getStatus();
    // example: {running: false,configured: false}
    return NextResponse.json(status);
  } catch (error) {
    logger.error(`获取Bot状态失败:${error}`);
    return NextResponse.json(
      { error: '获取状态失败' },
      { status: 500 }
    );
  }
}

// // POST - 控制Bot服务
export async function POST(request: NextRequest) {
  const { action } = await request.json();
  switch (action) {
    case 'start':
      try {
        const success = await telegramBot.start();
        if (success) {
          return NextResponse.json({ message: 'Telegram bot 启动成功' });
        } else {
          return NextResponse.json({ error: 'Telegram bot 启动失败' });
        }
      } catch (error: any) {
        return NextResponse.json({ error: error.message });
      }

    case 'stop':
      try {
        await telegramBot.stop();
        return NextResponse.json({ message: 'Telegram bot 停止成功' });
      } catch (error: any) {
        return NextResponse.json({ error: error.message });
      }

    case 'restart':
      const success = await telegramBot.restart();
      if (success) {
        return NextResponse.json({ message: 'Telegram bot 重启成功' });
      } else {
        return NextResponse.json({ error: 'Telegram bot 重启失败' });
      }

    default:
      return NextResponse.json({ error: '无效的操作' });
  }
  // try {
  //   const { action } = await request.json();

  //   if (!action || !['start', 'stop', 'restart'].includes(action)) {
  //     return NextResponse.json(
  //       { error: '无效的操作，支持: start, stop, restart' },
  //       { status: 400 }
  //     );
  //   }

  //   let result;
  //   switch (action) {
  //     case 'start':
  //       result = await startBotService();
  //       break;
  //     case 'stop':
  //       result = await stopBotService();
  //       break;
  //     case 'restart':
  //       result = await restartBotService();
  //       break;
  //     default:
  //       return NextResponse.json(
  //         { error: '无效的操作' },
  //         { status: 400 }
  //       );
  //   }

  //   if (result && result.success) {
  //     return NextResponse.json({
  //       success: true,
  //       message: result.message
  //     });
  //   } else {
  //     return NextResponse.json(
  //       { error: result?.message || '操作失败' },
  //       { status: 500 }
  //     );
  //   }
  // } catch (error) {
  //   logger.error(`控制Bot服务失败:${error}`);
  //   return NextResponse.json(
  //     { error: '操作失败' },
  //     { status: 500 }
  //   );
  // }
}

type BotAction = 'start' | 'stop' | 'restart' | 'status';

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse
// ) {
//   // Allow only POST for control actions and GET for status
//   if (req.method !== 'POST' && req.method !== 'GET') {
//     res.setHeader('Allow', ['GET', 'POST']);
//     return res.status(405).end(`Method ${req.method} Not Allowed`);
//   }

//   const { action } = req.query;

//   if (req.method === 'GET' && action === 'status') {
//     const status = telegramBot.getStatus();
//     return res.status(200).json(status);
//   }

//   if (req.method === 'POST') {
//     switch (action as BotAction) {
//       case 'start':
//         try {
//           const success = await telegramBot.start();
//           if (success) {
//             return res.status(200).json({ message: 'Telegram bot started successfully.' });
//           } else {
//             return res.status(500).json({ error: 'Failed to start Telegram bot. Check logs for details.' });
//           }
//         } catch (error: any) {
//           return res.status(500).json({ error: error.message });
//         }

//       case 'stop':
//         await telegramBot.stop();
//         return res.status(200).json({ message: 'Telegram bot stopped.' });

//       case 'restart':
//         const success = await telegramBot.restart();
//         if (success) {
//           return res.status(200).json({ message: 'Telegram bot restarted successfully.' });
//         } else {
//           return res.status(500).json({ error: 'Failed to restart Telegram bot. Check logs for details.' });
//         }

//       default:
//         return res.status(404).json({ error: 'Invalid action.' });
//     }
//   }

//   // Fallback for invalid GET requests
//   return res.status(404).json({ error: 'Invalid action or method.' });
// }