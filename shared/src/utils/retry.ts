// ─── Retry with exponential back-off + jitter ─────────────────────────────────

export interface RetryOptions {
  /** Maximum number of attempts (default: 3) */
  maxAttempts: number;
  /** Delay before the first retry in ms (default: 100) */
  initialDelayMs: number;
  /** Upper bound on computed delay in ms (default: 10 000) */
  maxDelayMs: number;
  /** Multiplier applied to delay after each failure (default: 2) */
  backoffMultiplier: number;
  /** Return false to give up immediately without further retries (default: always true) */
  shouldRetry?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 10_000,
  backoffMultiplier: 2,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeDelay(opts: RetryOptions, attempt: number): number {
  const exponential = opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt);
  const capped = Math.min(exponential, opts.maxDelayMs);
  const jitter = Math.random() * 100; // 0–100 ms
  return capped + jitter;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>,
): Promise<T> {
  const opts: RetryOptions = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const isRetryable = opts.shouldRetry === undefined || opts.shouldRetry(error);
      const isLastAttempt = attempt === opts.maxAttempts - 1;

      if (!isRetryable || isLastAttempt) {
        throw error;
      }

      const delayMs = computeDelay(opts, attempt);
      await sleep(delayMs);
    }
  }

  // This line is only reached if maxAttempts === 0
  throw lastError;
}
