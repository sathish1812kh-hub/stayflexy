// ─── Tracing (OpenTelemetry) ──────────────────────────────────────────────────
export {
  initTracer,
  withSpan,
  trace,
  context,
  SpanStatusCode,
  SpanKind,
} from './tracer'
export type { TracerOptions } from './tracer'

// ─── Structured Logger ────────────────────────────────────────────────────────
export { createLogger, createRequestLogger } from './logger'
export type { LoggerOptions, Logger } from './logger'

// ─── Correlation ID ───────────────────────────────────────────────────────────
export { getCorrelationId, correlationMiddleware } from './correlation'

// ─── Prometheus Metrics ───────────────────────────────────────────────────────
export {
  MetricsRegistry,
  createMetricsHandler,
  createHttpMetricsMiddleware,
} from './metrics'
export type { Counter, Histogram, Gauge } from './metrics'
