// FILE: src/modules/synchronization/queues/RetryQueue.ts
import type { QueuedSyncTask } from "./SyncQueue";

export interface RetryTask extends QueuedSyncTask {
  nextRetryAt: Date;
  failureReason: string;
}

export interface IRetryQueue {
  scheduleRetry(task: RetryTask): Promise<void>;
  getDueRetries(): Promise<RetryTask[]>;
  size(): number;
}

// In-memory retry queue with exponential backoff calculation.
// Production: use BullMQ delayed jobs.
export class InMemoryRetryQueue implements IRetryQueue {
  private readonly retries: RetryTask[] = [];

  async scheduleRetry(task: RetryTask): Promise<void> {
    this.retries.push(task);
  }

  async getDueRetries(): Promise<RetryTask[]> {
    const now = new Date();
    const due = this.retries.filter((t) => t.nextRetryAt <= now);
    // Remove due entries from queue
    for (const task of due) {
      const idx = this.retries.indexOf(task);
      if (idx !== -1) this.retries.splice(idx, 1);
    }
    return due;
  }

  size(): number {
    return this.retries.length;
  }
}

export function computeRetryDelay(retryCount: number, baseMs = 1000): number {
  return Math.min(baseMs * Math.pow(2, retryCount), 300_000); // cap at 5 minutes
}
