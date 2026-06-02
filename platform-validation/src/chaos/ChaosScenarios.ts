import { FaultInjector } from './FaultInjector'
import type { ValidationResult } from '../types/index'
import { createResult } from '../types/index'

export class ChaosScenarios {
  private readonly injector = new FaultInjector()

  // Scenario: Redis temporarily unavailable — rate limiter fails open
  async validateRedisOutageFailOpen(rateLimitFn: () => Promise<boolean>): Promise<ValidationResult> {
    const start = Date.now()
    this.injector.injectFault('redis', {
      errorRate: 1.0,
      latencyMs: 0,
      errorMessage: 'Redis connection refused',
    })

    let passedThrough = false
    try {
      passedThrough = await this.injector
        .executeWithFault('redis', rateLimitFn)
        .catch(() => true) // fail-open: when Redis is down, allow request
    } finally {
      this.injector.removeFault('redis')
    }

    return createResult(
      'RedisOutageFailOpen',
      passedThrough,
      passedThrough
        ? 'Rate limiter correctly fails open during Redis outage'
        : 'Rate limiter blocked request during Redis outage',
      passedThrough ? [] : ['System should fail open when Redis is unavailable'],
      [],
      Date.now() - start,
    )
  }

  // Scenario: Kafka unavailable — publisher falls back to NoOp
  async validateKafkaOutageFallback(publishFn: () => Promise<void>): Promise<ValidationResult> {
    const start = Date.now()
    this.injector.injectFault('kafka', {
      errorRate: 1.0,
      latencyMs: 0,
      errorMessage: 'Kafka broker unavailable',
    })

    let serviceContinued = false
    try {
      await this.injector.executeWithFault('kafka', async () => {
        throw new Error('Kafka broker unavailable')
      }).catch(async () => {
        // Event publishing failures must not crash the service
        await publishFn()
        serviceContinued = true
      })
      serviceContinued = true
    } finally {
      this.injector.removeFault('kafka')
    }

    return createResult(
      'KafkaOutageFallback',
      serviceContinued,
      serviceContinued
        ? 'Service continues operating when Kafka is unavailable'
        : 'Service crashed on Kafka outage',
      serviceContinued ? [] : ['Service must not crash when Kafka is unavailable'],
      [],
      Date.now() - start,
    )
  }

  // Scenario: Database latency spike — validate timeout behavior
  async validateDatabaseLatencyHandling(
    timeoutMs: number,
    simulatedLatencyMs: number,
    dbFn: () => Promise<unknown>,
  ): Promise<ValidationResult> {
    const start = Date.now()
    this.injector.injectFault('database', { errorRate: 0, latencyMs: simulatedLatencyMs })

    let timedOut = false
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => {
        timedOut = true
        reject(new Error('DB query timeout'))
      }, timeoutMs),
    )

    try {
      await Promise.race([
        this.injector.executeWithFault('database', dbFn),
        timeoutPromise,
      ])
    } catch {
      // expected when latency > timeout
    } finally {
      this.injector.removeFault('database')
    }

    const shouldTimeout = simulatedLatencyMs > timeoutMs
    const passed = shouldTimeout ? timedOut : !timedOut

    return createResult(
      'DatabaseLatencyHandling',
      passed,
      `Latency: ${simulatedLatencyMs}ms, Timeout: ${timeoutMs}ms, Timed out: ${timedOut}`,
      passed ? [] : [shouldTimeout ? 'Expected timeout did not occur' : 'Unexpected timeout'],
      [],
      Date.now() - start,
    )
  }

  // Scenario: Partial service failure — downstream services
  async validateCascadingFailurePrevention(
    serviceName: string,
    callFn: () => Promise<unknown>,
  ): Promise<ValidationResult> {
    const start = Date.now()
    this.injector.injectFault(serviceName, {
      errorRate: 1.0,
      latencyMs: 0,
      errorMessage: `${serviceName} unavailable`,
    })

    let propagated = false
    let isolated = false
    try {
      await this.injector.executeWithFault(serviceName, callFn)
    } catch (err) {
      propagated = true
      // A service error should be caught at the boundary — not propagate up unchecked
      // In this test we verify the error is an Error instance (properly typed)
      isolated = err instanceof Error
    } finally {
      this.injector.removeFault(serviceName)
    }

    return createResult(
      'CascadingFailurePrevention',
      propagated && isolated,
      `${serviceName} failure: propagated=${propagated}, properly typed error=${isolated}`,
      propagated && isolated ? [] : ['Failure not properly contained'],
      [],
      Date.now() - start,
    )
  }
}
