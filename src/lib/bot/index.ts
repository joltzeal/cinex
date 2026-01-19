import { TelegramBot } from '@/services/telegram/bot';
import { logger } from '../logger';

// Create a single, shared instance of the bot.
const telegramBot = new TelegramBot();

// Graceful shutdown logic
async function gracefulShutdown() {
  logger.info('Received shutdown signal. Gracefully shutting down...');
  await telegramBot.stop();
  // await disconnectPrisma();
  process.exit(0);
}

// Listen for termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default telegramBot;