import pino from 'pino'
import pinoHttp from 'pino-http'
import type { IncomingMessage, ServerResponse } from 'http'

export interface LoggerOptions {
  level?: 'debug' | 'info' | 'warn' | 'error'
  serviceName: string
  environment?: string
}

export type Logger = pino.Logger

export function createLogger(options: LoggerOptions): Logger {
  const isDev =
    (options.environment ?? process.env['NODE_ENV'] ?? 'development') === 'development'

  return pino({
    name: options.serviceName,
    level: options.level ?? (isDev ? 'debug' : 'info'),
    base: { service: options.serviceName, env: options.environment ?? process.env['NODE_ENV'] },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(isDev
      ? {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
          },
        }
      : {}),
  })
}

export function createRequestLogger(logger: Logger): ReturnType<typeof pinoHttp> {
  return pinoHttp({
    logger,
    customLogLevel: (_req: any, res: any) => {
      if (res.statusCode >= 500) return 'error'
      if (res.statusCode >= 400) return 'warn'
      return 'info'
    },
    customSuccessMessage: (req: any, res: any) => `${req.method} ${req.url} ${res.statusCode}`,
    serializers: {
      req: (req: Record<string, unknown>) => ({
        method: req['method'],
        url: req['url'],
        correlationId: (req['headers'] as Record<string, unknown>)?.['x-correlation-id'],
      }),
      res: (res: Record<string, unknown>) => ({ statusCode: res['statusCode'] }),
    },
  })
}

