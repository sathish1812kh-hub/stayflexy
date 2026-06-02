import { CircuitBreaker, CircuitOpenError } from './CircuitBreaker'
import type { ValidationResult } from '../types/index'
import { createResult } from '../types/index'

export class CircuitBreakerValidator {
  async validateOpenAfterFailures(failureThreshold: number): Promise<ValidationResult> {
    const start = Date.now()
    const cb = new CircuitBreaker<void>('test', failureThreshold, 60000)
    const failingFn = (): Promise<void> => Promise.reject(new Error('service error'))

    let circuitOpened = false
    for (let i = 0; i < failureThreshold + 1; i++) {
      try {
        await cb.execute(failingFn)
      } catch {
        /* expected */
      }
      if (cb.getState() === 'OPEN') {
        circuitOpened = true
        break
      }
    }

    return createResult(
      'CircuitBreakerOpensAfterThreshold',
      circuitOpened && cb.getState() === 'OPEN',
      `Circuit state after ${failureThreshold} failures: ${cb.getState()}`,
      circuitOpened ? [] : ['Circuit did not open after expected failures'],
      [],
      Date.now() - start,
    )
  }

  async validateRejectsWhenOpen(): Promise<ValidationResult> {
    const start = Date.now()
    const cb = new CircuitBreaker<void>('test', 1, 60000)
    try {
      await cb.execute(() => Promise.reject(new Error('fail')))
    } catch {
      /* open the circuit */
    }

    let rejectedWithOpenError = false
    try {
      await cb.execute(() => Promise.resolve())
    } catch (err) {
      rejectedWithOpenError = err instanceof CircuitOpenError
    }

    return createResult(
      'CircuitBreakerRejectsWhenOpen',
      rejectedWithOpenError,
      rejectedWithOpenError ? 'Open circuit correctly rejects calls' : 'Open circuit did not reject',
      rejectedWithOpenError ? [] : ['Expected CircuitOpenError not thrown'],
      [],
      Date.now() - start,
    )
  }

  async validateHalfOpenRecovery(): Promise<ValidationResult> {
    const start = Date.now()
    const cb = new CircuitBreaker<void>('test', 1, 10) // 10ms recovery
    try {
      await cb.execute(() => Promise.reject(new Error('fail')))
    } catch {
      /* open */
    }

    // Wait for recovery window
    await new Promise(resolve => setTimeout(resolve, 20))

    let recoveredToClosed = false
    try {
      await cb.execute(() => Promise.resolve())
      recoveredToClosed = cb.getState() === 'CLOSED'
    } catch {
      /* failed recovery */
    }

    return createResult(
      'CircuitBreakerHalfOpenRecovery',
      recoveredToClosed,
      `Circuit state after recovery: ${cb.getState()}`,
      recoveredToClosed ? [] : ['Circuit did not recover to CLOSED after successful call'],
      [],
      Date.now() - start,
    )
  }
}
