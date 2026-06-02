import type { ValidationResult } from '../types/index'
import { createResult } from '../types/index'

export class MetricsValidator {
  // Validates Prometheus text format
  validatePrometheusFormat(metricsText: string): ValidationResult {
    const start = Date.now()
    const errors: string[] = []

    if (!metricsText || metricsText.trim().length === 0) {
      return createResult(
        'PrometheusFormat',
        false,
        'Empty metrics output',
        ['Metrics text is empty'],
        [],
        Date.now() - start,
      )
    }

    const lines = metricsText.split('\n').filter(l => l.trim().length > 0)
    let hasHelp = false
    let hasType = false

    for (const line of lines) {
      if (line.startsWith('# HELP ')) {
        hasHelp = true
        const parts = line.slice(7).split(' ')
        if (parts.length < 2) errors.push(`Invalid HELP line: ${line}`)
      } else if (line.startsWith('# TYPE ')) {
        hasType = true
        const parts = line.slice(7).split(' ')
        const validTypes = ['counter', 'gauge', 'histogram', 'summary', 'untyped']
        const metricType = parts[1]
        if (!metricType || !validTypes.includes(metricType)) {
          errors.push(`Invalid TYPE: ${line}`)
        }
      } else if (line.startsWith('#')) {
        errors.push(`Unknown comment format: ${line}`)
      }
      // metric value lines: name{labels} value [timestamp]
    }

    if (!hasHelp) errors.push('No # HELP lines found')
    if (!hasType) errors.push('No # TYPE lines found')

    return createResult(
      'PrometheusFormat',
      errors.length === 0,
      `${lines.length} lines validated`,
      errors,
      [],
      Date.now() - start,
    )
  }

  // Validates required service metrics are present
  validateRequiredMetrics(metricsText: string, requiredMetrics: string[]): ValidationResult {
    const start = Date.now()
    const missing: string[] = []

    for (const metric of requiredMetrics) {
      if (!metricsText.includes(metric)) {
        missing.push(metric)
      }
    }

    return createResult(
      'RequiredMetrics',
      missing.length === 0,
      `${requiredMetrics.length - missing.length}/${requiredMetrics.length} required metrics present`,
      missing.map(m => `Missing metric: ${m}`),
      [],
      Date.now() - start,
    )
  }

  validateCorrelationIdPropagation(
    requests: Array<{ correlationId: string; serviceHops: string[] }>,
  ): ValidationResult {
    const start = Date.now()
    const errors: string[] = []

    for (const req of requests) {
      if (!req.correlationId || req.correlationId === 'no-context') {
        errors.push(`Missing correlation ID in request`)
        continue
      }
      // Verify the UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(req.correlationId)) {
        errors.push(`Invalid correlation ID format: ${req.correlationId}`)
      }
      if (req.serviceHops.length === 0) {
        errors.push(`No service hops recorded for correlation ID: ${req.correlationId}`)
      }
    }

    return createResult(
      'CorrelationIdPropagation',
      errors.length === 0,
      `${requests.length} requests validated for correlation ID propagation`,
      errors,
      [],
      Date.now() - start,
    )
  }
}
