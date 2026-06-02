import type { ValidationResult } from '../types/index'
import { createResult } from '../types/index'

export interface AuditLogEntry {
  id: string
  action: string
  actorId: string
  actorRole: string
  resourceType: string
  resourceId: string
  organizationId: string
  ipAddress?: string
  timestamp: string
  metadata?: Record<string, unknown>
}

const REQUIRED_AUDIT_ACTIONS = [
  'booking.created',
  'booking.cancelled',
  'payment.initiated',
  'payment.confirmed',
  'user.login',
  'user.logout',
  'user.created',
  'organization.created',
  'organization.updated',
  'hotel.created',
  'hotel.updated',
]

export class AuditLogValidator {
  validateAuditLogEntry(entry: unknown): ValidationResult {
    const start = Date.now()
    const errors: string[] = []
    const required = [
      'id',
      'action',
      'actorId',
      'actorRole',
      'resourceType',
      'resourceId',
      'organizationId',
      'timestamp',
    ]

    if (typeof entry !== 'object' || entry === null) {
      return createResult(
        'AuditLogEntry',
        false,
        'Entry is not an object',
        ['Not an object'],
        [],
        Date.now() - start,
      )
    }

    const e = entry as Record<string, unknown>
    for (const field of required) {
      if (!(field in e) || e[field] === null || e[field] === undefined || e[field] === '') {
        errors.push(`Missing or empty required field: ${field}`)
      }
    }

    if (typeof e['timestamp'] === 'string') {
      if (isNaN(new Date(e['timestamp']).getTime())) {
        errors.push(`Invalid timestamp: ${e['timestamp']}`)
      }
    }

    return createResult(
      'AuditLogEntry',
      errors.length === 0,
      `Audit entry validated: ${String(e['action'] ?? 'unknown')}`,
      errors,
      [],
      Date.now() - start,
    )
  }

  validateAuditCoverage(recordedActions: string[]): ValidationResult {
    const start = Date.now()
    const missing = REQUIRED_AUDIT_ACTIONS.filter(a => !recordedActions.includes(a))
    return createResult(
      'AuditCoverage',
      missing.length === 0,
      `${REQUIRED_AUDIT_ACTIONS.length - missing.length}/${REQUIRED_AUDIT_ACTIONS.length} required actions covered`,
      missing.map(a => `Missing audit for: ${a}`),
      [],
      Date.now() - start,
    )
  }

  validateNoSensitiveDataInAudit(entry: AuditLogEntry): ValidationResult {
    const start = Date.now()
    const sensitiveKeys = ['password', 'token', 'secret', 'cardNumber', 'cvv']
    const found: string[] = []

    const checkObj = (obj: Record<string, unknown>, path: string): void => {
      for (const [k, v] of Object.entries(obj)) {
        const fullPath = `${path}.${k}`
        if (sensitiveKeys.some(sk => k.toLowerCase().includes(sk.toLowerCase()))) {
          found.push(fullPath)
        }
        if (typeof v === 'object' && v !== null) {
          checkObj(v as Record<string, unknown>, fullPath)
        }
      }
    }

    if (entry.metadata) checkObj(entry.metadata, 'metadata')

    return createResult(
      'NoSensitiveDataInAudit',
      found.length === 0,
      found.length === 0 ? 'No sensitive data in audit entry' : `${found.length} sensitive field(s) found`,
      found.map(f => `Sensitive data in audit: ${f}`),
      [],
      Date.now() - start,
    )
  }
}
