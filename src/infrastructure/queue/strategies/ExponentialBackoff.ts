import type { BackoffOptions } from "../types";

export class BackoffCalculator {
  // Returns delay in ms before next retry attempt.
  static calculate(opts: BackoffOptions, attempt: number): number {
    if (opts.type === "exponential") {
      return Math.min(opts.delay * Math.pow(2, attempt - 1), 300_000); // cap at 5 min
    }
    return opts.delay;
  }

  static isRetryable(attempt: number, maxAttempts: number): boolean {
    return attempt < maxAttempts;
  }
}
