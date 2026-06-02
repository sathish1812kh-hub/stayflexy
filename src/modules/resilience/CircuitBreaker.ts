export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  failureThreshold: number;   // failures before OPEN
  successThreshold: number;   // successes in HALF_OPEN before CLOSED
  timeoutMs: number;          // time in OPEN before HALF_OPEN
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  successThreshold: 2,
  timeoutMs: 30_000,
};

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private successCount = 0;
  private lastFailureAt: number | null = null;
  private readonly opts: CircuitBreakerOptions;

  constructor(
    readonly name: string,
    opts: Partial<CircuitBreakerOptions> = {}
  ) {
    this.opts = { ...DEFAULT_OPTIONS, ...opts };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (this.shouldAttemptReset()) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error(`Circuit breaker OPEN: ${this.name}`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureAt: this.lastFailureAt,
    };
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= this.opts.successThreshold) {
        this.state = "CLOSED";
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureAt = Date.now();
    this.successCount = 0;
    if (this.failureCount >= this.opts.failureThreshold) {
      this.state = "OPEN";
    }
  }

  private shouldAttemptReset(): boolean {
    return this.lastFailureAt !== null && Date.now() - this.lastFailureAt >= this.opts.timeoutMs;
  }
}
