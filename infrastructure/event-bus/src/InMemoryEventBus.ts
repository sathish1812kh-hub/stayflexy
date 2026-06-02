import { randomUUID } from 'crypto';
import type {
  IEventBus,
  DomainEventEnvelope,
  EventHandler,
  SubscribeOptions,
  StreamInfo,
} from './types';

// ─── InMemoryEventBus ─────────────────────────────────────────────────────────
// Intended for unit tests and local development. Calls handlers synchronously
// (in the same microtask) so tests can inspect side effects immediately.

export class InMemoryEventBus implements IEventBus {
  private readonly subscriptions = new Map<string, EventHandler[]>();
  private readonly history = new Map<string, DomainEventEnvelope[]>();

  // ── publish ──────────────────────────────────────────────────────────────────

  async publish(
    event: Omit<DomainEventEnvelope, 'eventId' | 'timestamp'>,
  ): Promise<string> {
    const entryId = randomUUID();
    const envelope: DomainEventEnvelope = {
      ...event,
      eventId: entryId,
      timestamp: new Date().toISOString(),
    };

    // Record in history
    const existing = this.history.get(envelope.eventType) ?? [];
    existing.push(envelope);
    this.history.set(envelope.eventType, existing);

    // Notify all subscribers
    const handlers = this.subscriptions.get(envelope.eventType) ?? [];
    for (const handler of handlers) {
      await handler(envelope as DomainEventEnvelope & { payload: unknown });
    }

    return entryId;
  }

  // ── subscribe ─────────────────────────────────────────────────────────────────

  async subscribe<T = unknown>(
    eventType: string,
    handler: EventHandler<T>,
    _options?: SubscribeOptions,
  ): Promise<void> {
    const existing = this.subscriptions.get(eventType) ?? [];
    existing.push(handler as EventHandler);
    this.subscriptions.set(eventType, existing);
  }

  // ── unsubscribe ───────────────────────────────────────────────────────────────

  async unsubscribe(eventType: string): Promise<void> {
    this.subscriptions.delete(eventType);
  }

  // ── isConnected ───────────────────────────────────────────────────────────────

  isConnected(): boolean {
    return true;
  }

  // ── disconnect ────────────────────────────────────────────────────────────────

  async disconnect(): Promise<void> {
    this.subscriptions.clear();
  }

  // ── getStreamInfo ─────────────────────────────────────────────────────────────

  async getStreamInfo(eventType: string): Promise<StreamInfo> {
    const entries = this.history.get(eventType) ?? [];
    const lastEntry = entries[entries.length - 1];
    return {
      length: entries.length,
      groups: Array.from(this.subscriptions.keys()),
      lastEntryId: lastEntry?.eventId ?? null,
    };
  }

  // ── Testing utilities ─────────────────────────────────────────────────────────

  getHistory(eventType: string): DomainEventEnvelope[] {
    return [...(this.history.get(eventType) ?? [])];
  }

  clearHistory(): void {
    this.history.clear();
  }

  getPublishedCount(eventType?: string): number {
    if (eventType !== undefined) {
      return this.history.get(eventType)?.length ?? 0;
    }
    let total = 0;
    for (const events of this.history.values()) {
      total += events.length;
    }
    return total;
  }
}
