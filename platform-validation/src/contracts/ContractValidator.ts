import { z } from 'zod'
import type { ValidationResult } from '../types/index'
import { createResult } from '../types/index'

export class ContractValidator {
  validateEnvelope(data: unknown, schema: z.ZodTypeAny, contractName: string): ValidationResult {
    const start = Date.now()
    const result = schema.safeParse(data)
    if (result.success) {
      return createResult(contractName, true, `Contract validated: ${contractName}`, [], [], Date.now() - start)
    }
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
    return createResult(contractName, false, `Contract violation: ${contractName}`, errors, [], Date.now() - start)
  }

  validateEnvelopeBatch(envelopes: unknown[], schema: z.ZodTypeAny, contractName: string): ValidationResult {
    const start = Date.now()
    const allErrors: string[] = []
    for (let i = 0; i < envelopes.length; i++) {
      const r = schema.safeParse(envelopes[i])
      if (!r.success) {
        allErrors.push(...r.error.errors.map(e => `[${i}] ${e.path.join('.')}: ${e.message}`))
      }
    }
    const passed = allErrors.length === 0
    return createResult(
      contractName,
      passed,
      `Batch validation: ${envelopes.length} envelopes, ${allErrors.length} errors`,
      allErrors,
      [],
      Date.now() - start,
    )
  }

  // Validates that duplicate eventIds are rejected (idempotency check)
  validateNoDuplicateEventIds(envelopes: Array<{ eventId: string }>): ValidationResult {
    const start = Date.now()
    const seen = new Set<string>()
    const duplicates: string[] = []
    for (const env of envelopes) {
      if (seen.has(env.eventId)) {
        duplicates.push(env.eventId)
      }
      seen.add(env.eventId)
    }
    const passed = duplicates.length === 0
    return createResult(
      'NoDuplicateEventIds',
      passed,
      passed ? 'No duplicate event IDs detected' : `${duplicates.length} duplicate event IDs found`,
      duplicates.map(id => `Duplicate eventId: ${id}`),
      [],
      Date.now() - start,
    )
  }

  // Validates monotonically non-decreasing timestamps (event ordering)
  validateEventOrdering(events: Array<{ timestamp: string; eventId: string }>): ValidationResult {
    const start = Date.now()
    const errors: string[] = []
    for (let i = 1; i < events.length; i++) {
      const prev = events[i - 1]
      const curr = events[i]
      if (prev && curr && new Date(curr.timestamp) < new Date(prev.timestamp)) {
        errors.push(`Event ${curr.eventId} (${curr.timestamp}) is before ${prev.eventId} (${prev.timestamp})`)
      }
    }
    return createResult(
      'EventOrdering',
      errors.length === 0,
      errors.length === 0 ? 'Events are correctly ordered' : `${errors.length} ordering violations`,
      errors,
      [],
      Date.now() - start,
    )
  }
}
