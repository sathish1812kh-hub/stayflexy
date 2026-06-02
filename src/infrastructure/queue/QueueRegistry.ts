import { InMemoryQueueAdapter } from "./adapters/InMemoryQueueAdapter";
import type { IQueue } from "./types";
import { QUEUE_NAMES, type QueueName } from "./constants";

class QueueRegistry {
  private readonly queues = new Map<string, IQueue>();

  private getOrCreate(name: string): IQueue {
    const existing = this.queues.get(name);
    if (existing) return existing;
    const queue = new InMemoryQueueAdapter(name);
    this.queues.set(name, queue);
    return queue;
  }

  get booking(): IQueue {
    return this.getOrCreate(QUEUE_NAMES.BOOKING);
  }

  get payment(): IQueue {
    return this.getOrCreate(QUEUE_NAMES.PAYMENT);
  }

  get inventorySync(): IQueue {
    return this.getOrCreate(QUEUE_NAMES.INVENTORY_SYNC);
  }

  get otaSync(): IQueue {
    return this.getOrCreate(QUEUE_NAMES.OTA_SYNC);
  }

  get notification(): IQueue {
    return this.getOrCreate(QUEUE_NAMES.NOTIFICATION);
  }

  get housekeeping(): IQueue {
    return this.getOrCreate(QUEUE_NAMES.HOUSEKEEPING);
  }

  get reportGeneration(): IQueue {
    return this.getOrCreate(QUEUE_NAMES.REPORT_GENERATION);
  }

  getQueue(name: QueueName): IQueue {
    return this.getOrCreate(name);
  }

  async getStats(): Promise<Record<string, { size: number; deadLetter: number }>> {
    const stats: Record<string, { size: number; deadLetter: number }> = {};
    for (const [name, queue] of this.queues) {
      const [size, dlJobs] = await Promise.all([queue.size(), queue.getDeadLetterJobs()]);
      stats[name] = { size, deadLetter: dlJobs.length };
    }
    return stats;
  }
}

export const queueRegistry = new QueueRegistry();
