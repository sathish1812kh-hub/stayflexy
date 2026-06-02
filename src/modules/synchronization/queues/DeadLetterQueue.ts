// FILE: src/modules/synchronization/queues/DeadLetterQueue.ts

export interface DeadLetterEntry {
  jobId: string;
  organizationId: string;
  hotelId: string;
  providerId: string;
  syncType: string;
  failureReason: string;
  retryCount: number;
  deadLetterAt: Date;
}

export interface IDeadLetterQueue {
  add(entry: DeadLetterEntry): Promise<void>;
  list(): DeadLetterEntry[];
  size(): number;
}

// In-memory dead-letter queue. Production: persist to a dedicated DLQ topic/table.
export class InMemoryDeadLetterQueue implements IDeadLetterQueue {
  private readonly entries: DeadLetterEntry[] = [];

  async add(entry: DeadLetterEntry): Promise<void> {
    this.entries.push(entry);
  }

  list(): DeadLetterEntry[] {
    return [...this.entries];
  }

  size(): number {
    return this.entries.length;
  }
}
