import pino from 'pino'
import pinoHttp from 'pino-http'
import type { IncomingMessage, ServerResponse } from 'http'
import { randomUUID } from 'crypto'

export interface LoggerOptions {
  level?: 'debug' | 'info' | 'warn' | 'error'
  prettyPrint?: boolean
  serviceName: string
  environment?: string
}

export interface TraceContext {
  traceId: string
  spanId: string
  correlationId: string
  parentSpanId?: string
}

export type Logger = pino.Logger

export function createLogger(options: LoggerOptions): Logger {
  const isDev = (options.environment ?? process.env['NODE_ENV'] ?? 'development') === 'development'
  return pino({
    name: options.serviceName,
    level: options.level ?? (isDev ? 'debug' : 'info'),
    base: {
      service: options.serviceName,
      env: options.environment ?? process.env['NODE_ENV'],
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(isDev
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          },
        }
      : {}),
  })
}

/**
 * Extracts distributed trace context from HTTP headers or generates fresh IDs.
 */
export function extractTraceHeaders(
  headers: Record<string, string | string[] | undefined>,
): TraceContext {
  const getHeader = (key: string): string | undefined => {
    const val = headers[key.toLowerCase()] ?? headers[key]
    return Array.isArray(val) ? val[0] : val
  }

  const correlationId = getHeader('x-correlation-id') ?? getHeader('x-request-id') ?? randomUUID()

  // Support W3C traceparent (version-traceid-parentid-traceflags)
  const traceparent = getHeader('traceparent')
  let traceId = getHeader('x-trace-id')
  let parentSpanId: string | undefined

  if (traceparent && traceparent.startsWith('00-')) {
    const parts = traceparent.split('-')
    if (parts.length >= 4) {
      traceId = parts[1]
      parentSpanId = parts[2]
    }
  }

  traceId = traceId ?? correlationId
  const spanId = randomUUID().replace(/-/g, '').slice(0, 16)

  return {
    traceId,
    spanId,
    correlationId,
    parentSpanId,
  }
}

/**
 * Injects distributed trace context into outbound HTTP request headers.
 */
export function injectTraceHeaders(
  headers: Record<string, string>,
  context: TraceContext,
): Record<string, string> {
  headers['x-correlation-id'] = context.correlationId
  headers['x-trace-id'] = context.traceId
  headers['x-span-id'] = context.spanId
  headers['traceparent'] = `00-${context.traceId.padEnd(32, '0')}-${context.spanId}-01`
  return headers
}

/**
 * Creates a child logger with bound trace context for contextualized logging.
 */
export function withTraceContext(logger: Logger, context: TraceContext): Logger {
  return logger.child({
    traceId: context.traceId,
    spanId: context.spanId,
    correlationId: context.correlationId,
    parentSpanId: context.parentSpanId,
  })
}

export function createRequestLogger(logger: Logger): any {
  return pinoHttp({
    logger,
    customLogLevel: (_req: any, res: any) => {
      if (res.statusCode && res.statusCode >= 500) return 'error'
      if (res.statusCode && res.statusCode >= 400) return 'warn'
      return 'info'
    },
    customSuccessMessage: (req: any, res: any) => `${req.method} ${req.url} ${res.statusCode}`,
    customReceivedMessage: (req: any) => `Incoming ${req.method} ${req.url}`,
    serializers: {
      req: (req: Record<string, unknown>) => {
        const headers = (req['headers'] as Record<string, unknown>) ?? {}
        return {
          method: req['method'],
          url: req['url'],
          correlationId: headers['x-correlation-id'],
          traceId: headers['x-trace-id'],
        }
      },
      res: (res: Record<string, unknown>) => ({
        statusCode: res['statusCode'],
      }),
    },
  })
}
