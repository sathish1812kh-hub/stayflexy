// ─── Core envelope ────────────────────────────────────────────────────────────

export interface DomainEventEnvelope {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  organizationId: string;
  /** ISO 8601 */
  timestamp: string;
  /** Schema version for forward-compatibility */
  version: number;
  correlationId?: string;
  /** ID of the upstream event that triggered this one */
  causationId?: string;
  payload: unknown;
  metadata?: Record<string, unknown>;
}

// ─── Handler signature ────────────────────────────────────────────────────────

export type EventHandler<T = unknown> = (
  event: DomainEventEnvelope & { payload: T },
) => Promise<void>;

// ─── Subscription options ─────────────────────────────────────────────────────

export interface SubscribeOptions {
  /** Consumer group name (defaults to service name) */
  groupName?: string;
  /** Consumer instance name (defaults to OS hostname) */
  consumerName?: string;
  /** How long in ms to block waiting for new entries (default 1 000) */
  blockMs?: number;
  /** Max delivery attempts before sending to DLQ (default 3) */
  maxRetries?: number;
  /** Whether to enable the dead-letter queue (default true) */
  dlqEnabled?: boolean;
}

// ─── Stream info ──────────────────────────────────────────────────────────────

export interface StreamInfo {
  length: number;
  groups: string[];
  lastEntryId: string | null;
}

// ─── IEventBus ────────────────────────────────────────────────────────────────

export interface IEventBus {
  /** Publish an event and return the Redis entry ID */
  publish(
    event: Omit<DomainEventEnvelope, 'eventId' | 'timestamp'>,
  ): Promise<string>;

  subscribe<T = unknown>(
    eventType: string,
    handler: EventHandler<T>,
    options?: SubscribeOptions,
  ): Promise<void>;

  unsubscribe(eventType: string): Promise<void>;

  isConnected(): boolean;
  disconnect(): Promise<void>;

  getStreamInfo(eventType: string): Promise<StreamInfo>;
}

// ─── IDeadLetterQueue ─────────────────────────────────────────────────────────

export interface DlqEntry {
  event: DomainEventEnvelope;
  error: string;
  attempts: number;
  failedAt: string;
}

export interface IDeadLetterQueue {
  send(event: DomainEventEnvelope, error: Error, attempts: number): Promise<void>;
  peek(limit?: number): Promise<DlqEntry[]>;
  retry(eventId: string): Promise<void>;
  purge(olderThanDays: number): Promise<number>;
}
