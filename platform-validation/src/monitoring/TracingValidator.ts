import type { ValidationResult } from '../types/index'
import { createResult } from '../types/index'

export interface SpanDescriptor {
  spanId: string
  traceId: string
  parentSpanId?: string
  operationName: string
  serviceName: string
  startTimeMs: number
  endTimeMs: number
  status: 'OK' | 'ERROR'
  attributes?: Record<string, string | number | boolean>
}

export class TracingValidator {
  validateSpanCompleteness(spans: SpanDescriptor[]): ValidationResult {
    const start = Date.now()
    const errors: string[] = []

    for (const span of spans) {
      if (!span.traceId) errors.push(`Span ${span.spanId} missing traceId`)
      if (!span.serviceName) errors.push(`Span ${span.spanId} missing serviceName`)
      if (span.endTimeMs <= span.startTimeMs) {
        errors.push(
          `Span ${span.spanId} has invalid duration: start=${span.startTimeMs} end=${span.endTimeMs}`,
        )
      }
    }

    return createResult(
      'SpanCompleteness',
      errors.length === 0,
      `${spans.length} spans validated`,
      errors,
      [],
      Date.now() - start,
    )
  }

  validateTraceConnectivity(spans: SpanDescriptor[]): ValidationResult {
    const start = Date.now()
    const spanMap = new Map(spans.map(s => [s.spanId, s]))
    const errors: string[] = []

    // All spans in a trace should have the same traceId
    const traceIds = new Set(spans.map(s => s.traceId))
    if (traceIds.size > 1) {
      errors.push(`Spans have multiple trace IDs: ${[...traceIds].join(', ')}`)
    }

    // All parent span IDs should reference existing spans
    for (const span of spans) {
      if (span.parentSpanId && !spanMap.has(span.parentSpanId)) {
        errors.push(`Span ${span.spanId} references unknown parent: ${span.parentSpanId}`)
      }
    }

    // There should be exactly one root span (no parent)
    const rootSpans = spans.filter(s => !s.parentSpanId)
    if (rootSpans.length !== 1) {
      errors.push(`Expected 1 root span, found ${rootSpans.length}`)
    }

    return createResult(
      'TraceConnectivity',
      errors.length === 0,
      `${spans.length} spans, ${traceIds.size} trace(s), ${rootSpans.length} root span(s)`,
      errors,
      [],
      Date.now() - start,
    )
  }

  validateErrorSpanAnnotation(span: SpanDescriptor): ValidationResult {
    const start = Date.now()
    const errors: string[] = []

    if (span.status === 'ERROR') {
      if (!span.attributes?.['error.message'] && !span.attributes?.['exception.message']) {
        errors.push(`Error span ${span.spanId} missing error.message attribute`)
      }
    }

    return createResult(
      'ErrorSpanAnnotation',
      errors.length === 0,
      `Span ${span.spanId} status=${span.status}`,
      errors,
      [],
      Date.now() - start,
    )
  }
}
