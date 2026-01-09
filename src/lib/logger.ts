import pino, { Logger } from 'pino';

export const logger: Logger =
  process.env['NODE_ENV'] === 'production'
    ? // JSON in production
      pino({ level: 'warn' })
    : // Pretty print in development
      pino({
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            // pino-pretty v6+ 使用 translateTime
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
            ignore: 'pid,hostname' // 忽略不必要的字段
          }
        },
        level: 'debug'
      });
