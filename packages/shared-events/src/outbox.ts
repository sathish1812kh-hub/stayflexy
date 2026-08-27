import type { IEventPublisher, EventEnvelope } from './index'
import { publishToDLQ, MAX_RETRIES, getRetryDelayMs } from './dlq'

// ─── Retry Strategy ──────────────────────────────────────────────────────────
//
// Stayflexi retry/DLQ strategy:
//   1. Producer-side: KafkaEventPublisher uses idempotent producer with kafkajs
//      internal retries (3 attempts, exponential factor 2, 100ms initial).
//   2. Outbox relay: PENDING outbox rows are retried with exponential backoff
//      via OutboxService.processPendingBatch — delay doubles each attempt
//      (1s, 2s, 4s, ...) up to MAX_RETRIES=3. After exhaustion, the row is
//      marked FAILED and the original event is published to:
//        - stayflexi.<topic>.dlq (primary DLQ, 30-day retention)
//        - <topic>.dlq (legacy DLQ for backwards compatibility)
//   3. Consumer-side: consumers using the shared retry helpers in dlq.ts
//      republish failed messages to stayflexi.<topic>.retry topics with a
//      retryCount header. After MAX_RETRIES, the message is sent to the DLQ.
//   4. Topics: every domain topic has a sibling `stayflexi.<topic>.dlq` and
//      `stayflexi.<topic>.retry` created by the kafka-topic-setup Job.

export type RetryBackoff = 'linear' | 'exponential' | 'fixed'

export interface RetryOptions {
  maxRetries?: number
  backoff?: RetryBackoff
  baseDelayMs?: number
  maxDelayMs?: number
  shouldRetry?: (err: unknown, attempt: number) => boolean
  onRetry?: (err: unknown, attempt: number, delayMs: number) => void
}

function computeBackoff(
  attempt: number,
  opts: Required<Pick<RetryOptions, 'backoff' | 'baseDelayMs' | 'maxDelayMs'>>,
): number {
  const base = opts.baseDelayMs
  if (opts.backoff === 'fixed') return Math.min(base, opts.maxDelayMs)
  if (opts.backoff === 'linear') return Math.min(base * attempt, opts.maxDelayMs)
  // exponential (default) — base * 2^(attempt-1)
  return Math.min(base * Math.pow(2, Math.max(0, attempt - 1)), opts.maxDelayMs)
}

/**
 * withRetry — generic async retry helper used by services that need custom
 * retry behaviour outside the outbox/relay path. Default is 3 retries with
 * exponential backoff (1s, 2s, 4s) and a 30s ceiling.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxRetries = options.maxRetries ?? MAX_RETRIES
  const backoff = options.backoff ?? 'exponential'
  const baseDelayMs = options.baseDelayMs ?? 1000
  const maxDelayMs = options.maxDelayMs ?? 30000
  const shouldRetry = options.shouldRetry ?? (() => true)

  let lastError: unknown
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt > maxRetries || !shouldRetry(err, attempt)) break
      const delayMs = computeBackoff(attempt, { backoff, baseDelayMs, maxDelayMs })
      options.onRetry?.(err, attempt, delayMs)
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  throw lastError
}

// ─── Outbox Prisma Model Spec ───────────────────────────────────────────────
// model OutboxEvent {
//   id            String       @id @default(uuid())
//   aggregateId   String       @db.VarChar(255)
//   aggregateType String       @db.VarChar(100)
//   eventType     String       @db.VarChar(150)
//   topic         String       @db.VarChar(150)
//   payload       Json
//   status        OutboxStatus @default(PENDING)
//   retryCount    Int          @default(0)
//   nextRetryAt   DateTime?
//   createdAt     DateTime     @default(now())
//   updatedAt     DateTime     @updatedAt
// }
// enum OutboxStatus { PENDING PUBLISHED FAILED }

export const OUTBOX_STATUS = {
  PENDING: 'PENDING',
  PUBLISHED: 'PUBLISHED',
  FAILED: 'FAILED',
} as const

export type OutboxStatus = (typeof OUTBOX_STATUS)[keyof typeof OUTBOX_STATUS]

export interface OutboxEventRecord {
  id: string
  aggregateId: string
  aggregateType: string
  eventType: string
  topic: string
  payload: unknown
  status: OutboxStatus
  retryCount: number
  nextRetryAt: Date | null
  createdAt: Date
  updatedAt?: Date
}

export interface OutboxCreateInput {
  aggregateId: string
  aggregateType: string
  eventType: string
  topic: string
  payload: unknown
  organizationId?: string
}

/**
 * Minimal Prisma delegate shape — use index signatures to satisfy
 * noPropertyAccessFromIndexSignature without importing @prisma/client.
 */
export interface OutboxDb {
  ['outboxEvent']: {
    create(args: { data: Record<string, unknown> }): Promise<OutboxEventRecord>
    findMany(args: {
      where?: Record<string, unknown>
      take?: number
      orderBy?: Record<string, unknown>
    }): Promise<OutboxEventRecord[]>
    update(args: {
      where: { id: string }
      data: Record<string, unknown>
    }): Promise<OutboxEventRecord>
    findUnique(args: { where: { id: string } }): Promise<OutboxEventRecord | null>
  }
  ['$transaction']?: <T>(fn: (tx: OutboxDb) => Promise<T>) => Promise<T>
}

export class OutboxRepository {
  constructor(private readonly db: OutboxDb) {}

  async create(input: OutboxCreateInput): Promise<OutboxEventRecord> {
    const data: Record<string, unknown> = {
      aggregateId: input.aggregateId,
      aggregateType: input.aggregateType,
      eventType: input.eventType,
      topic: input.topic,
      payload: input.payload as unknown,
      status: OUTBOX_STATUS.PENDING,
      retryCount: 0,
      nextRetryAt: new Date(),
    }
    // Include organizationId if provided (optional field in prisma model extension)
    if (input.organizationId) data['organizationId'] = input.organizationId
    const created = await this.db['outboxEvent'].create({ data })
    return created
  }

  async findPending(limit = 20): Promise<OutboxEventRecord[]> {
    return this.db['outboxEvent'].findMany({
      where: {
        status: OUTBOX_STATUS.PENDING,
        nextRetryAt: { lte: new Date() },
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
    })
  }

  async findFailed(limit = 20): Promise<OutboxEventRecord[]> {
    return this.db['outboxEvent'].findMany({
      where: { status: OUTBOX_STATUS.FAILED },
      take: limit,
      orderBy: { createdAt: 'asc' },
    })
  }

  async markPublished(id: string): Promise<OutboxEventRecord> {
    return this.db['outboxEvent'].update({
      where: { id },
      data: { status: OUTBOX_STATUS.PUBLISHED, nextRetryAt: null },
    })
  }

  async markRetry(id: string, retryCount: number, nextRetryAt: Date): Promise<OutboxEventRecord> {
    return this.db['outboxEvent'].update({
      where: { id },
      data: { retryCount, nextRetryAt, status: OUTBOX_STATUS.PENDING },
    })
  }

  async markFailed(id: string, retryCount: number): Promise<OutboxEventRecord> {
    return this.db['outboxEvent'].update({
      where: { id },
      data: { status: OUTBOX_STATUS.FAILED, retryCount, nextRetryAt: null },
    })
  }
}

/**
 * OutboxService — transactional outbox pattern.
 *
 * Usage:
 *   const outbox = new OutboxService(prisma, publisher, logger)
 *   // Inside a business transaction:
 *   await outbox.publishWithOutbox('booking.events', { aggregateId, aggregateType, eventType, organizationId, payload })
 *
 * The relay (processPendingBatch / startRelay) should be run as a background interval
 * to guarantee at-least-once delivery even if the initial publish fails.
 */
export class OutboxService {
  private relayTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly db: OutboxDb,
    private readonly publisher: IEventPublisher,
    private readonly logger?: {
      info: (...a: unknown[]) => void
      warn: (...a: unknown[]) => void
      error: (...a: unknown[]) => void
      debug?: (...a: unknown[]) => void
    },
  ) {}

  private get repo(): OutboxRepository {
    return new OutboxRepository(this.db)
  }

  /**
   * Write event to outbox table and immediately attempt publish.
   * If publish fails, the record remains PENDING for the relay to retry.
   * When `useTransaction` is true and db supports $transaction, the write is done transactionally.
   */
  async publishWithOutbox<T>(
    topic: string,
    event: Omit<EventEnvelope<T>, 'eventId' | 'timestamp' | 'version'> & { version?: number },
    opts?: { organizationId?: string },
  ): Promise<OutboxEventRecord> {
    const payloadForStorage = event.payload as unknown
    const record = await this.repo.create({
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      eventType: event.eventType,
      topic,
      payload: payloadForStorage,
      organizationId: event.organizationId ?? opts?.['organizationId'],
    })

    try {
      await this.publisher.publish(topic, event)
      await this.repo.markPublished(record['id'])
      this.logger?.['info']?.(
        { outboxId: record['id'], topic, eventType: event.eventType },
        'Outbox event published synchronously',
      )
      return { ...record, status: OUTBOX_STATUS.PUBLISHED } as OutboxEventRecord
    } catch (err) {
      const nextRetryAt = new Date(Date.now() + getRetryDelayMs(1))
      await this.repo.markRetry(record['id'], 1, nextRetryAt).catch(() => undefined)
      this.logger?.['warn']?.(
        { err, outboxId: record['id'], topic },
        'Outbox publish failed — scheduled for retry',
      )
      throw err
    }
  }

  /**
   * Transactional helper: execute business logic inside a Prisma transaction
   * and also write the outbox event atomically. The publish is attempted after
   * the transaction commits (relay guarantees eventual delivery).
   *
   * Example:
   *   await outbox.withTransaction(async (tx) => {
   *     await tx['booking'].create({ data: {...} })
   *     await outbox.publishWithOutboxTx(tx, 'booking.events', envelope)
   *   })
   */
  async withTransaction<T>(fn: (tx: OutboxDb) => Promise<T>): Promise<T> {
    const maybeTx = this.db['$transaction']
    if (typeof maybeTx === 'function') {
      return maybeTx(fn as unknown as (tx: unknown) => Promise<T>)
    }
    // Fallback — no transaction support (e.g., mocked db)
    return fn(this.db)
  }

  /** Publish via a transactional client without immediate Kafka publish (relay will handle). */
  async publishWithOutboxTx<T>(
    tx: OutboxDb,
    topic: string,
    event: Omit<EventEnvelope<T>, 'eventId' | 'timestamp' | 'version'> & { version?: number },
  ): Promise<OutboxEventRecord> {
    const repo = new OutboxRepository(tx)
    const rec = await repo.create({
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      eventType: event.eventType,
      topic,
      payload: event.payload as unknown,
      organizationId: event.organizationId,
    })
    return rec
  }

  /**
   * Process a batch of PENDING outbox events: publish each, update status,
   * apply exponential backoff, and route to DLQ after MAX_RETRIES.
   */
  async processPendingBatch(
    batchSize = 20,
  ): Promise<{ processed: number; failed: number; dlq: number }> {
    const pending = await this.repo.findPending(batchSize)
    let processed = 0
    let failed = 0
    let dlq = 0

    for (const record of pending) {
      const topic = String(record['topic'] ?? record['eventType'])
      const currentRetry = Number(record['retryCount'] ?? 0)
      const envelope: EventEnvelope<unknown> = {
        eventId: record['id'],
        eventType: String(record['eventType']),
        aggregateId: String(record['aggregateId']),
        aggregateType: String(record['aggregateType']),
        organizationId:
          ((record as unknown as Record<string, unknown>)['organizationId'] as string) ?? 'system',
        version: 1,
        timestamp: new Date().toISOString(),
        payload: record['payload'],
      }

      try {
        await this.publisher.publish(topic, envelope)
        await this.repo.markPublished(record['id'])
        processed++
        this.logger?.['debug']?.({ outboxId: record['id'], topic }, 'Outbox relay published')
      } catch (err) {
        const nextRetry = currentRetry + 1
        const reason = err instanceof Error ? err.message : String(err)
        if (nextRetry >= MAX_RETRIES) {
          await this.repo.markFailed(record['id'], nextRetry).catch(() => undefined)
          try {
            await publishToDLQ(this.publisher, topic, JSON.stringify(record['payload']), reason, {
              eventId: record['id'],
              attemptCount: nextRetry,
            })
            dlq++
          } catch {
            // DLQ publish failure should not crash relay
          }
          this.logger?.['error']?.(
            { err, outboxId: record['id'], topic, retryCount: nextRetry },
            'Outbox event moved to DLQ after max retries',
          )
          failed++
        } else {
          const nextRetryAt = new Date(Date.now() + getRetryDelayMs(nextRetry))
          await this.repo.markRetry(record['id'], nextRetry, nextRetryAt).catch(() => undefined)
          this.logger?.['warn']?.(
            { err, outboxId: record['id'], topic, retryCount: nextRetry, nextRetryAt },
            'Outbox relay retry scheduled',
          )
          failed++
        }
      }
    }

    return { processed, failed, dlq }
  }

  /** Start background relay polling every intervalMs. Returns stop function. */
  startRelay(intervalMs = 5000): () => void {
    if (this.relayTimer) return () => this.stopRelay()
    this.relayTimer = setInterval(() => {
      void this.processPendingBatch().catch((err) => {
        this.logger?.['error']?.({ err }, 'Outbox relay batch error')
      })
    }, intervalMs)
    // Don't block Node exit
    if (
      this.relayTimer &&
      typeof (this.relayTimer as unknown as { unref?: () => void })['unref'] === 'function'
    ) {
      ;(this.relayTimer as unknown as { unref: () => void }).unref()
    }
    this.logger?.['info']?.({ intervalMs }, 'Outbox relay started')
    return () => this.stopRelay()
  }

  stopRelay(): void {
    if (this.relayTimer) {
      clearInterval(this.relayTimer as unknown as NodeJS.Timeout)
      this.relayTimer = null
      this.logger?.['info']?.('Outbox relay stopped')
    }
  }
}
