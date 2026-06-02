import { CircuitBreakerValidator } from '../resilience/CircuitBreakerValidator'
import { RetryBehaviorValidator } from '../resilience/RetryBehaviorValidator'
import { RetryStormValidator } from '../resilience/RetryStormValidator'

describe('CircuitBreakerValidator', () => {
  let cbValidator: CircuitBreakerValidator

  beforeEach(() => {
    cbValidator = new CircuitBreakerValidator()
  })

  it('circuit opens after reaching the failure threshold', async () => {
    const result = await cbValidator.validateOpenAfterFailures(3)
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('circuit rejects calls when in OPEN state', async () => {
    const result = await cbValidator.validateRejectsWhenOpen()
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('circuit recovers to CLOSED via half-open state after recovery window', async () => {
    const result = await cbValidator.validateHalfOpenRecovery()
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})

describe('RetryBehaviorValidator', () => {
  let retryValidator: RetryBehaviorValidator

  beforeEach(() => {
    retryValidator = new RetryBehaviorValidator()
  })

  it('retry policy eventually succeeds on transient failures', async () => {
    const result = await retryValidator.validateEventualSuccess()
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('retry exhaustion throws RetryExhaustedError after max attempts', async () => {
    const result = await retryValidator.validateExhaustionError()
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('selective retry skips non-retryable errors immediately', async () => {
    const result = await retryValidator.validateSelectiveRetry()
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})

describe('RetryStormValidator', () => {
  let stormValidator: RetryStormValidator

  beforeEach(() => {
    stormValidator = new RetryStormValidator()
  })

  it('exponential backoff delays grow with each attempt', () => {
    const result = stormValidator.validateExponentialBackoffGrowth(100, 5)
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
    // Verify description includes growing delays
    expect(result.details).toContain('ms')
  })

  it('max delay cap prevents unbounded growth at high attempt numbers', () => {
    // At attempt 20, uncapped delay = 10 * 2^19 = 5,242,880ms
    // With max cap of 30,000ms, the capped delay should be 30,000ms
    const result = stormValidator.validateMaxDelayCap(10, 30000, 20)
    expect(result.passed).toBe(true)
    expect(result.details).toContain('30000ms')
  })

  it('max delay cap: small delay within limit passes', () => {
    // At attempt 2, uncapped delay = 100 * 2^1 = 200ms, max = 5000ms — within limit
    const result = stormValidator.validateMaxDelayCap(100, 5000, 2)
    expect(result.passed).toBe(true)
  })

  it('exponential backoff with base delay 1ms grows across 6 attempts', () => {
    const result = stormValidator.validateExponentialBackoffGrowth(1, 6)
    expect(result.passed).toBe(true)
    // delays should be: 1, 2, 4, 8, 16, 32
    expect(result.details).toContain('1ms, 2ms, 4ms, 8ms, 16ms, 32ms')
  })
})
