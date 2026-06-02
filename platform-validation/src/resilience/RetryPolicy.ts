export class RetryExhaustedError extends Error {
  constructor(
    public readonly attemptCount: number,
    public readonly lastError: unknown,
  ) {
    super(
      `Retry exhausted after ${attemptCount} attempt(s): ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    )
    this.name = 'RetryExhaustedError'
  }
}

export class RetryPolicy {
  private _attemptCount = 0
  private _lastError: unknown = undefined

  constructor(
    private readonly maxAttempts: number,
    private readonly baseDelayMs: number,
    private readonly maxDelayMs: number,
    private readonly shouldRetry: (err: unknown) => boolean = () => true,
  ) {}

  get attemptCount(): number {
    return this._attemptCount
  }

  get lastError(): unknown {
    return this._lastError
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this._attemptCount = 0
    this._lastError = undefined

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      this._attemptCount = attempt
      try {
        return await fn()
      } catch (err) {
        this._lastError = err

        if (!this.shouldRetry(err)) {
          throw err
        }

        if (attempt >= this.maxAttempts) {
          throw new RetryExhaustedError(attempt, err)
        }

        const delay = Math.min(
          this.baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 100,
          this.maxDelayMs,
        )
        await new Promise<void>(resolve => setTimeout(resolve, delay))
      }
    }

    // TypeScript requires a return — this path is unreachable
    throw new RetryExhaustedError(this._attemptCount, this._lastError)
  }
}
