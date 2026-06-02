import pino from 'pino';

export interface LoggerOptions {
  level?: 'debug' | 'info' | 'warn' | 'error';
  /** Use pino-pretty formatting in development (default: true in dev) */
  prettyPrint?: boolean;
  serviceName: string;
  environment?: string;
}

export type Logger = pino.Logger;

export function createLogger(options: LoggerOptions): pino.Logger {
  const isDev =
    options.environment === 'development' ||
    process.env['NODE_ENV'] === 'development';

  const usePretty = isDev && options.prettyPrint !== false;

  return pino({
    level: options.level ?? (isDev ? 'debug' : 'info'),
    ...(usePretty
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
            },
          },
        }
      : {}),
    base: {
      service: options.serviceName,
      environment:
        options.environment ?? process.env['NODE_ENV'] ?? 'development',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
  });
}
