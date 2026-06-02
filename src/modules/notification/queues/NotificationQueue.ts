export interface QueuedNotification {
  notificationId: string;
  notificationType: string;
  recipient: string;
  priority: number;
  enqueuedAt: Date;
  retryCount: number;
}

export interface INotificationQueue {
  enqueue(item: QueuedNotification): Promise<void>;
  dequeue(): Promise<QueuedNotification | null>;
  size(): number;
}

export class InMemoryNotificationQueue implements INotificationQueue {
  private readonly queue: QueuedNotification[] = [];

  async enqueue(item: QueuedNotification): Promise<void> {
    const idx = this.queue.findIndex((q) => q.priority < item.priority);
    if (idx === -1) {
      this.queue.push(item);
    } else {
      this.queue.splice(idx, 0, item);
    }
  }

  async dequeue(): Promise<QueuedNotification | null> {
    return this.queue.shift() ?? null;
  }

  size(): number {
    return this.queue.length;
  }
}

export const notificationQueue = new InMemoryNotificationQueue();
