import type { ValidationResult } from '../types/index'
import { createResult } from '../types/index'

export interface LogEntry {
  level: string
  service: string
  message: string
  correlationId?: string
  timestamp: string
  [key: string]: unknown
}

export class LoggingValidator {
  validateStructuredLogFormat(entry: unknown): ValidationResult {
    const start = Date.now()
    const errors: string[] = []
    const requiredFields = ['level', 'message', 'timestamp']

    if (typeof entry !== 'object' || entry === null) {
      return createResult(
        'StructuredLogFormat',
        false,
        'Log entry is not an object',
        ['Not an object'],
        [],
        Date.now() - start,
      )
    }

    const log = entry as Record<string, unknown>
    for (const field of requiredFields) {
      if (!(field in log)) errors.push(`Missing required field: ${field}`)
    }

    const validLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal']
    if (typeof log['level'] === 'string' && !validLevels.includes(log['level'].toLowerCase())) {
      errors.push(`Invalid log level: ${log['level']}`)
    }

    if (typeof log['timestamp'] === 'string') {
      const ts = new Date(log['timestamp'])
      if (isNaN(ts.getTime())) errors.push(`Invalid timestamp: ${log['timestamp']}`)
    }

    return createResult(
      'StructuredLogFormat',
      errors.length === 0,
      `Log entry validated`,
      errors,
      [],
      Date.now() - start,
    )
  }

  validateSensitiveDataMasking(log: Record<string, unknown>): ValidationResult {
    const start = Date.now()
    const sensitiveFields = [
      'password',
      'passwordHash',
      'refreshToken',
      'accessToken',
      'cardNumber',
      'cvv',
      'creditCard',
    ]
    const exposed: string[] = []

    const checkObject = (obj: Record<string, unknown>, path = ''): void => {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${key}` : key
        if (sensitiveFields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
          exposed.push(`Sensitive field found: ${fullPath}`)
        }
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          checkObject(value as Record<string, unknown>, fullPath)
        }
      }
    }

    checkObject(log)
    return createResult(
      'SensitiveDataMasking',
      exposed.length === 0,
      exposed.length === 0
        ? 'No sensitive data exposed in log'
        : `${exposed.length} sensitive field(s) found`,
      exposed,
      [],
      Date.now() - start,
    )
  }

  validateCorrelationIdInLogs(logs: LogEntry[], expectedCorrelationId: string): ValidationResult {
    const start = Date.now()
    const missing = logs.filter(l => l.correlationId !== expectedCorrelationId)
    return createResult(
      'CorrelationIdInLogs',
      missing.length === 0,
      `${logs.length - missing.length}/${logs.length} log entries have correct correlation ID`,
      missing.map((_, i) => `Log entry ${i} missing expected correlation ID`),
      [],
      Date.now() - start,
    )
  }
}
