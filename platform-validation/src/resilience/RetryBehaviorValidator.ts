import { RetryPolicy, RetryExhaustedError } from './RetryPolicy'
import type { ValidationResult } from '../types/index'
import { createResult } from '../types/index'

export class RetryBehaviorValidator {
  async validateEventualSuccess(): Promise<ValidationResult> {
    const start = Date.now()
    const policy = new RetryPolicy(5, 1, 100)
    let attempts = 0
    await policy.execute(async () => {
      attempts++
      if (attempts < 3) throw new Error('transient error')
    })
    const passed = attempts === 3
    return createResult(
      'RetryEventualSuccess',
      passed,
      `Succeeded on attempt ${attempts}`,
      passed ? [] : [`Expected 3 attempts, got ${attempts}`],
      [],
      Date.now() - start,
    )
  }

  async validateExhaustionError(): Promise<ValidationResult> {
    const start = Date.now()
    const policy = new RetryPolicy(3, 1, 100)
    let threw = false
    try {
      await policy.execute(() => Promise.reject(new Error('permanent error')))
    } catch (err) {
      threw = err instanceof RetryExhaustedError
    }
    return createResult(
      'RetryExhaustion',
      threw,
      threw ? 'RetryExhaustedError thrown after max attempts' : 'Expected error not thrown',
      threw ? [] : ['RetryExhaustedError not thrown'],
      [],
      Date.now() - start,
    )
  }

  async validateSelectiveRetry(): Promise<ValidationResult> {
    const start = Date.now()
    class NonRetryableError extends Error {}
    const policy = new RetryPolicy(5, 1, 100, err => !(err instanceof NonRetryableError))
    let attempts = 0
    let threw = false
    try {
      await policy.execute(async () => {
        attempts++
        throw new NonRetryableError('do not retry')
      })
    } catch {
      threw = true
    }
    const passed = threw && attempts === 1
    return createResult(
      'SelectiveRetry',
      passed,
      `Non-retryable error: ${attempts} attempt(s)`,
      passed ? [] : [`Expected 1 attempt, got ${attempts}`],
      [],
      Date.now() - start,
    )
  }
}
