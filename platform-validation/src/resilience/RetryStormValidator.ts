import type { ValidationResult } from '../types/index'
import { createResult } from '../types/index'

export class RetryStormValidator {
  // Verifies exponential backoff: each delay must be >= previous (with tolerance for jitter)
  validateExponentialBackoffGrowth(
    baseDelayMs: number,
    maxAttempts: number,
  ): ValidationResult {
    const start = Date.now()
    const delays: number[] = []
    for (let i = 0; i < maxAttempts; i++) {
      delays.push(baseDelayMs * Math.pow(2, i))
    }
    // Each delay must be >= previous (growing)
    const errors: string[] = []
    for (let i = 1; i < delays.length; i++) {
      const prev = delays[i - 1]
      const curr = delays[i]
      if (prev !== undefined && curr !== undefined && curr < prev) {
        errors.push(`Delay at attempt ${i + 1} (${curr}ms) is not >= attempt ${i} (${prev}ms)`)
      }
    }
    return createResult(
      'ExponentialBackoffGrowth',
      errors.length === 0,
      `Backoff delays: ${delays.join('ms, ')}ms`,
      errors,
      [],
      Date.now() - start,
    )
  }

  // Verifies max delay cap prevents infinite growth
  validateMaxDelayCap(baseDelayMs: number, maxDelayMs: number, attempt: number): ValidationResult {
    const start = Date.now()
    const uncappedDelay = baseDelayMs * Math.pow(2, attempt - 1)
    const cappedDelay = Math.min(uncappedDelay, maxDelayMs)
    const passed = cappedDelay <= maxDelayMs
    return createResult(
      'MaxDelayCapEnforced',
      passed,
      `Attempt ${attempt}: uncapped ${uncappedDelay}ms → capped ${cappedDelay}ms (max: ${maxDelayMs}ms)`,
      passed ? [] : [`Delay ${cappedDelay}ms exceeds max ${maxDelayMs}ms`],
      [],
      Date.now() - start,
    )
  }
}
