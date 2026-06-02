// FILE: src/modules/synchronization/queues/SyncQueue.ts

export interface QueuedSyncTask {
  jobId: string;
  organizationId: string;
  hotelId: string;
  providerId: string;
  syncType: string;
  priority: number;
  enqueuedAt: Date;
  retryCount: number;
}

export interface ISyncQueue {
  enqueue(task: QueuedSyncTask): Promise<void>;
  dequeue(): Promise<QueuedSyncTask | null>;
  size(): number;
  peek(): QueuedSyncTask | null;
}

// In-memory implementation for development and testing.
// Production: replace with BullMQ backed by Redis.
export class InMemorySyncQueue implements ISyncQueue {
  private readonly queue: QueuedSyncTask[] = [];

  async enqueue(task: QueuedSyncTask): Promise<void> {
    // Insert by priority (higher priority = earlier in queue)
    const idx = this.queue.findIndex((t) => t.priority < task.priority);
    if (idx === -1) {
      this.queue.push(task);
    } else {
      this.queue.splice(idx, 0, task);
    }
  }

  async dequeue(): Promise<QueuedSyncTask | null> {
    return this.queue.shift() ?? null;
  }

  size(): number {
    return this.queue.length;
  }

  peek(): QueuedSyncTask | null {
    return this.queue[0] ?? null;
  }
}
