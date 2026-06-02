import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { hostname } from 'os';
import type {
  IEventBus,
  DomainEventEnvelope,
  EventHandler,
  SubscribeOptions,
  StreamInfo,
} from './types';

const STREAM_PREFIX = 'stayflexi:events';
const DLQ_PREFIX = 'stayflexi:dlq';
const PROCESSED_SET_PREFIX = 'stayflexi:processed';

// ─── Subscription state ───────────────────────────────────────────────────────

interface SubscriptionState {
  handler: EventHandler;
  options: Required<SubscribeOptions>;
  running: boolean;
  timer?: ReturnType<typeof setInterval>;
  /** Dedicated blocking connection for XREADGROUP */
  blockingClient: Redis;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function streamKey(eventType: string): string {
  return `${STREAM_PREFIX}:${eventType}`;
}

function dlqKey(eventType: string): string {
  return `${DLQ_PREFIX}:${eventType}`;
}

function processedKey(groupName: string, eventType: string): string {
  return `${PROCESSED_SET_PREFIX}:${groupName}:${eventType}`;
}

function serializeEnvelope(env: DomainEventEnvelope): string[] {
  // Flatten into Redis field-value pairs
  return [
    'eventId', env.eventId,
    'eventType', env.eventType,
    'aggregateId', env.aggregateId,
    'aggregateType', env.aggregateType,
    'organizationId', env.organizationId,
    'timestamp', env.timestamp,
    'version', String(env.version),
    ...(env.correlationId !== undefined ? ['correlationId', env.correlationId] : []),
    ...(env.causationId !== undefined ? ['causationId', env.causationId] : []),
    'payload', JSON.stringify(env.payload),
    'metadata', JSON.stringify(env.metadata ?? {}),
  ];
}

function deserializeFields(fields: string[]): DomainEventEnvelope {
  const map = new Map<string, string>();
  for (let i = 0; i + 1 < fields.length; i += 2) {
    const key = fields[i];
    const val = fields[i + 1];
    if (key !== undefined && val !== undefined) {
      map.set(key, val);
    }
  }

  const get = (k: string): string => {
    const v = map.get(k);
    if (v === undefined) throw new Error(`Missing required field: ${k}`);
    return v;
  };

  return {
    eventId: get('eventId'),
    eventType: get('eventType'),
    aggregateId: get('aggregateId'),
    aggregateType: get('aggregateType'),
    organizationId: get('organizationId'),
    timestamp: get('timestamp'),
    version: parseInt(get('version'), 10),
    correlationId: map.get('correlationId'),
    causationId: map.get('causationId'),
    payload: JSON.parse(get('payload')) as unknown,
    metadata: JSON.parse(map.get('metadata') ?? '{}') as Record<string, unknown>,
  };
}

// ─── RedisStreamEventBus ──────────────────────────────────────────────────────

export class RedisStreamEventBus implements IEventBus {
  private readonly subscriptions = new Map<string, SubscriptionState>();
  private connected = false;

  constructor(
    private readonly redis: Redis,
    private readonly serviceName: string,
  ) {
    this.redis.on('connect', () => {
      this.connected = true;
    });
    this.redis.on('close', () => {
      this.connected = false;
    });
    this.redis.on('error', () => {
      // Errors are surfaced via publish/subscribe; keep the bus alive
    });
  }

  // ── publish ──────────────────────────────────────────────────────────────────

  async publish(
    event: Omit<DomainEventEnvelope, 'eventId' | 'timestamp'>,
  ): Promise<string> {
    const envelope: DomainEventEnvelope = {
      ...event,
      eventId: randomUUID(),
      timestamp: new Date().toISOString(),
    };

    const key = streamKey(envelope.eventType);
    const fields = serializeEnvelope(envelope);

    // XADD stream * field value [field value ...]
    const entryId = await this.redis.xadd(key, '*', ...fields);
    if (entryId === null) {
      throw new Error(`XADD returned null for stream ${key}`);
    }
    return entryId;
  }

  // ── subscribe ─────────────────────────────────────────────────────────────────

  async subscribe<T = unknown>(
    eventType: string,
    handler: EventHandler<T>,
    options?: SubscribeOptions,
  ): Promise<void> {
    const resolvedOptions: Required<SubscribeOptions> = {
      groupName: options?.groupName ?? this.serviceName,
      consumerName: options?.consumerName ?? hostname(),
      blockMs: options?.blockMs ?? 1_000,
      maxRetries: options?.maxRetries ?? 3,
      dlqEnabled: options?.dlqEnabled ?? true,
    };

    const key = streamKey(eventType);

    // Ensure consumer group exists, ignore BUSYGROUP error
    try {
      await this.redis.xgroup('CREATE', key, resolvedOptions.groupName, '$', 'MKSTREAM');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('BUSYGROUP')) throw err;
    }

    // Create a dedicated blocking connection for XREADGROUP
    const blockingClient = this.redis.duplicate();

    const state: SubscriptionState = {
      handler: handler as EventHandler,
      options: resolvedOptions,
      running: true,
      blockingClient,
    };
    this.subscriptions.set(eventType, state);

    // Start polling loop
    const poll = async (): Promise<void> => {
      while (state.running) {
        try {
          await this.pollOnce(eventType, state);
        } catch {
          // Keep the loop alive; individual errors are handled inside pollOnce
        }
      }
    };

    // Run the poll loop without blocking the current async context
    void poll();
  }

  // ── pollOnce ──────────────────────────────────────────────────────────────────

  private async pollOnce(
    eventType: string,
    state: SubscriptionState,
  ): Promise<void> {
    const key = streamKey(eventType);
    const { groupName, consumerName, blockMs, maxRetries, dlqEnabled } = state.options;

    // XREADGROUP GROUP group consumer COUNT 10 BLOCK blockMs STREAMS stream >
    const results = await state.blockingClient.xreadgroup(
      'GROUP',
      groupName,
      consumerName,
      'COUNT',
      '10',
      'BLOCK',
      String(blockMs),
      'STREAMS',
      key,
      '>',
    );

    if (!results) return;

    for (const [, entries] of results) {
      if (!entries) continue;

      for (const [messageId, fields] of entries) {
        if (!messageId || !fields) continue;

        const processedSetKey = processedKey(groupName, eventType);

        // Idempotency: skip already-processed events
        const alreadyProcessed = await this.redis.sismember(processedSetKey, messageId);
        if (alreadyProcessed === 1) {
          await this.redis.xack(key, groupName, messageId);
          continue;
        }

        let lastError: Error | undefined;
        let succeeded = false;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            const envelope = deserializeFields(fields);
            await state.handler(envelope as DomainEventEnvelope & { payload: unknown });
            succeeded = true;
            break;
          } catch (err: unknown) {
            lastError = err instanceof Error ? err : new Error(String(err));
          }
        }

        if (succeeded) {
          await this.redis.xack(key, groupName, messageId);
          // Record as processed with 24-hour TTL to guard against redelivery
          await this.redis.sadd(processedSetKey, messageId);
          await this.redis.expire(processedSetKey, 86_400);
        } else if (dlqEnabled && lastError !== undefined) {
          try {
            const envelope = deserializeFields(fields);
            const dlqEntry = JSON.stringify({
              event: envelope,
              error: lastError.message,
              attempts: maxRetries,
              failedAt: new Date().toISOString(),
            });
            await this.redis.rpush(dlqKey(eventType), dlqEntry);
          } catch {
            // If DLQ write fails, still ack so we don't loop forever
          }
          await this.redis.xack(key, groupName, messageId);
        } else {
          // Not retryable and DLQ disabled — ack to avoid infinite redelivery
          await this.redis.xack(key, groupName, messageId);
        }
      }
    }
  }

  // ── unsubscribe ───────────────────────────────────────────────────────────────

  async unsubscribe(eventType: string): Promise<void> {
    const state = this.subscriptions.get(eventType);
    if (!state) return;

    state.running = false;
    if (state.timer !== undefined) {
      clearInterval(state.timer);
    }
    await state.blockingClient.disconnect();
    this.subscriptions.delete(eventType);
  }

  // ── isConnected ───────────────────────────────────────────────────────────────

  isConnected(): boolean {
    return this.connected;
  }

  // ── disconnect ────────────────────────────────────────────────────────────────

  async disconnect(): Promise<void> {
    for (const [eventType] of this.subscriptions) {
      await this.unsubscribe(eventType);
    }
    await this.redis.quit();
  }

  // ── getStreamInfo ─────────────────────────────────────────────────────────────

  async getStreamInfo(eventType: string): Promise<StreamInfo> {
    const key = streamKey(eventType);

    const length = await this.redis.xlen(key);

    // XINFO GROUPS returns an array of arrays
    let groups: string[] = [];
    try {
      const rawGroups = await this.redis.xinfo('GROUPS', key);
      if (Array.isArray(rawGroups)) {
        for (const groupEntry of rawGroups) {
          if (!Array.isArray(groupEntry)) continue;
          // Each group is represented as [field, value, field, value ...]
          // 'name' field is at index 1
          const nameIdx = groupEntry.indexOf('name');
          if (nameIdx !== -1 && nameIdx + 1 < groupEntry.length) {
            const name = groupEntry[nameIdx + 1];
            if (typeof name === 'string') {
              groups.push(name);
            }
          }
        }
      }
    } catch {
      groups = [];
    }

    // Last entry ID via XREVRANGE stream + INF - +INF LIMIT 0 1
    let lastEntryId: string | null = null;
    try {
      const recent = await this.redis.xrevrange(key, '+', '-', 'COUNT', 1);
      if (recent.length > 0 && recent[0] !== undefined) {
        lastEntryId = recent[0][0] ?? null;
      }
    } catch {
      lastEntryId = null;
    }

    return { length, groups, lastEntryId };
  }
}
