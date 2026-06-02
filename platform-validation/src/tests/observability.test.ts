import { MetricsValidator } from '../monitoring/MetricsValidator'
import { TracingValidator } from '../monitoring/TracingValidator'
import type { SpanDescriptor } from '../monitoring/TracingValidator'
import { LoggingValidator } from '../monitoring/LoggingValidator'
import type { LogEntry } from '../monitoring/LoggingValidator'

const VALID_PROMETHEUS_TEXT = `# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 1234
# HELP http_request_duration_seconds HTTP request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 800
http_request_duration_seconds_bucket{le="0.5"} 1100
http_request_duration_seconds_bucket{le="+Inf"} 1200
http_request_duration_seconds_sum 185.3
http_request_duration_seconds_count 1200
`

function makeSpan(overrides: Partial<SpanDescriptor> = {}): SpanDescriptor {
  return {
    spanId: 'span-001',
    traceId: 'trace-abc-123',
    operationName: 'HTTP GET /api/v1/bookings',
    serviceName: 'booking-service',
    startTimeMs: 1000,
    endTimeMs: 1050,
    status: 'OK',
    ...overrides,
  }
}

describe('MetricsValidator', () => {
  let metricsValidator: MetricsValidator

  beforeEach(() => {
    metricsValidator = new MetricsValidator()
  })

  it('valid Prometheus text format passes validation', () => {
    const result = metricsValidator.validatePrometheusFormat(VALID_PROMETHEUS_TEXT)
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('empty metrics text fails validation', () => {
    const result = metricsValidator.validatePrometheusFormat('')
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('empty') || e.includes('Empty'))).toBe(true)
  })

  it('required metrics present in output passes', () => {
    const required = ['http_requests_total', 'http_request_duration_seconds']
    const result = metricsValidator.validateRequiredMetrics(VALID_PROMETHEUS_TEXT, required)
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('required metric missing from output fails', () => {
    const required = ['http_requests_total', 'booking_created_total']
    const result = metricsValidator.validateRequiredMetrics(VALID_PROMETHEUS_TEXT, required)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('booking_created_total'))).toBe(true)
  })
})

describe('TracingValidator', () => {
  let tracingValidator: TracingValidator

  beforeEach(() => {
    tracingValidator = new TracingValidator()
  })

  it('valid complete spans pass span completeness validation', () => {
    const spans: SpanDescriptor[] = [
      makeSpan({ spanId: 'root', parentSpanId: undefined }),
      makeSpan({ spanId: 'child-1', parentSpanId: 'root', startTimeMs: 1005, endTimeMs: 1030 }),
    ]
    const result = tracingValidator.validateSpanCompleteness(spans)
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('disconnected trace span (unknown parentSpanId) fails connectivity validation', () => {
    const spans: SpanDescriptor[] = [
      makeSpan({ spanId: 'root', parentSpanId: undefined }),
      makeSpan({ spanId: 'orphan', parentSpanId: 'nonexistent-parent' }),
    ]
    const result = tracingValidator.validateTraceConnectivity(spans)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('nonexistent-parent'))).toBe(true)
  })

  it('valid connected trace passes connectivity validation', () => {
    const spans: SpanDescriptor[] = [
      makeSpan({ spanId: 'root', parentSpanId: undefined }),
      makeSpan({ spanId: 'child', parentSpanId: 'root', startTimeMs: 1005, endTimeMs: 1040 }),
      makeSpan({ spanId: 'grandchild', parentSpanId: 'child', startTimeMs: 1010, endTimeMs: 1025 }),
    ]
    const result = tracingValidator.validateTraceConnectivity(spans)
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('error span missing error.message attribute fails annotation validation', () => {
    const span = makeSpan({
      spanId: 'error-span',
      status: 'ERROR',
      attributes: { 'http.status_code': 500 }, // no error.message
    })
    const result = tracingValidator.validateErrorSpanAnnotation(span)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('error.message'))).toBe(true)
  })

  it('error span with error.message attribute passes annotation validation', () => {
    const span = makeSpan({
      spanId: 'error-span-2',
      status: 'ERROR',
      attributes: { 'error.message': 'Booking not found', 'http.status_code': 404 },
    })
    const result = tracingValidator.validateErrorSpanAnnotation(span)
    expect(result.passed).toBe(true)
  })

  it('OK span passes error span annotation validation', () => {
    const span = makeSpan({ status: 'OK' })
    const result = tracingValidator.validateErrorSpanAnnotation(span)
    expect(result.passed).toBe(true)
  })
})

describe('LoggingValidator', () => {
  let loggingValidator: LoggingValidator

  beforeEach(() => {
    loggingValidator = new LoggingValidator()
  })

  it('valid structured log entry passes format validation', () => {
    const entry = {
      level: 'info',
      message: 'Booking created successfully',
      timestamp: new Date().toISOString(),
      service: 'booking-service',
      correlationId: 'corr-001',
    }
    const result = loggingValidator.validateStructuredLogFormat(entry)
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('log entry missing required field fails format validation', () => {
    const entry = {
      level: 'info',
      // missing message
      timestamp: new Date().toISOString(),
    }
    const result = loggingValidator.validateStructuredLogFormat(entry)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('message'))).toBe(true)
  })

  it('log entry with invalid level fails format validation', () => {
    const entry = {
      level: 'verbose', // not a standard pino level
      message: 'Something happened',
      timestamp: new Date().toISOString(),
    }
    const result = loggingValidator.validateStructuredLogFormat(entry)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('level'))).toBe(true)
  })

  it('log entry without sensitive data passes masking validation', () => {
    const log: Record<string, unknown> = {
      userId: 'user-001',
      bookingId: 'booking-001',
      action: 'checkout',
      amount: 299.99,
    }
    const result = loggingValidator.validateSensitiveDataMasking(log)
    expect(result.passed).toBe(true)
  })

  it('log entry with sensitive data (password field) fails masking validation', () => {
    const log: Record<string, unknown> = {
      userId: 'user-001',
      password: 'plaintext-pass',
      action: 'login',
    }
    const result = loggingValidator.validateSensitiveDataMasking(log)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('password'))).toBe(true)
  })

  it('correlation ID propagation: all logs have matching correlation ID', () => {
    const correlationId = 'a1b2c3d4-e5f6-4789-a012-b34567890abc'
    const logs: LogEntry[] = [
      { level: 'info', service: 'booking-service', message: 'Request received', correlationId, timestamp: new Date().toISOString() },
      { level: 'info', service: 'inventory-service', message: 'Inventory checked', correlationId, timestamp: new Date().toISOString() },
      { level: 'info', service: 'booking-service', message: 'Booking created', correlationId, timestamp: new Date().toISOString() },
    ]
    const result = loggingValidator.validateCorrelationIdInLogs(logs, correlationId)
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('correlation ID propagation: logs with wrong correlation ID fail', () => {
    const expectedId = 'a1b2c3d4-e5f6-4789-a012-b34567890abc'
    const logs: LogEntry[] = [
      { level: 'info', service: 'booking-service', message: 'Request received', correlationId: expectedId, timestamp: new Date().toISOString() },
      { level: 'warn', service: 'payment-service', message: 'Payment started', correlationId: 'different-id', timestamp: new Date().toISOString() },
    ]
    const result = loggingValidator.validateCorrelationIdInLogs(logs, expectedId)
    expect(result.passed).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})
