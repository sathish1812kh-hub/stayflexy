export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export class CircuitOpenError extends Error {
  constructor(public readonly resource: string) {
    super(`Circuit is OPEN for resource: ${resource}`)
    this.name = 'CircuitOpenError'
  }
}

export class CircuitBreaker<T> {
  private state: CircuitState = 'CLOSED'
  private failureCount = 0
  private successCount = 0
  private lastFailureTime = 0

  constructor(
    private readonly resource: string,
    private readonly failureThreshold: number,
    private readonly recoveryTimeMs: number,
    private readonly halfOpenSuccessThreshold = 1,
  ) {}

  async execute(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.recoveryTimeMs) {
        this.state = 'HALF_OPEN'
        this.successCount = 0
      } else {
        throw new CircuitOpenError(this.resource)
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (err) {
      this.onFailure()
      throw err
    }
  }

  private onSuccess(): void {
    this.failureCount = 0
    if (this.state === 'HALF_OPEN') {
      this.successCount++
      if (this.successCount >= this.halfOpenSuccessThreshold) {
        this.state = 'CLOSED'
      }
    }
  }

  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN'
    }
  }

  getState(): CircuitState {
    return this.state
  }

  getFailureCount(): number {
    return this.failureCount
  }

  reset(): void {
    this.state = 'CLOSED'
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = 0
  }
}
