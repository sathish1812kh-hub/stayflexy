import type { IDistributedLock } from "../types";
import { LOCK_ERRORS, LOCK_RETRY_ATTEMPTS, LOCK_RETRY_INTERVAL_MS } from "../constants";

export class LockAcquisitionError extends Error {
  constructor(key: string) {
    super(`${LOCK_ERRORS.ACQUISITION_FAILED}: ${key}`);
    this.name = "LockAcquisitionError";
  }
}

// Executes fn() while holding a distributed lock.
// Retries LOCK_RETRY_ATTEMPTS times before throwing LockAcquisitionError.
export async function withLock<T>(
  lock: IDistributedLock,
  key: string,
  ttlMs: number,
  owner: string,
  fn: () => Promise<T>
): Promise<T> {
  let attempt = 0;
  while (attempt < LOCK_RETRY_ATTEMPTS) {
    const result = await lock.acquire(key, ttlMs, owner);
    if (result.acquired) {
      try {
        return await fn();
      } finally {
        await lock.release(key, owner);
      }
    }
    attempt++;
    if (attempt < LOCK_RETRY_ATTEMPTS) {
      await new Promise((res) => setTimeout(res, LOCK_RETRY_INTERVAL_MS));
    }
  }
  throw new LockAcquisitionError(key);
}
