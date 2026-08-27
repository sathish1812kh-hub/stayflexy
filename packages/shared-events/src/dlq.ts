import { Kafka, Consumer, EachMessagePayload } from 'kafkajs'
import type { IEventPublisher } from './index'

export const MAX_RETRIES = 3
export const BASE_RETRY_DELAY_MS = 1000

// Topic name suffixes — used by helpers to derive the DLQ/retry topic for
// any primary topic. See ADR-001 (hexagonal architecture) and the
// `infrastructure/kubernetes/jobs/kafka-topic-setup.yaml` Job for the
// full topic catalogue.
export const DLQ_TOPIC_SUFFIX = '.dlq'
export const RETRY_TOPIC_SUFFIX = '.retry'
export const STAYFLEXI_TOPIC_PREFIX = 'stayflexi.'

export interface DLQMessage {
  originalTopic: string
  originalPayload: string
  failureReason: string
  attemptCount: number
  firstFailedAt: string
  lastFailedAt: string
  eventId?: string
  correlationId?: string
}

export interface RetryMessageMeta {
  retryCount: number
  firstFailedAt: string
  lastFailureReason: string
}

/**
 * Helper: derive DLQ topic name for a given primary topic.
 * Spec: stayflexi.<topic>.dlq  (e.g. booking.events -> stayflexi.booking.events.dlq)
 * For backwards compatibility the bare "<topic>.dlq" is also considered valid;
 * this helper always returns the namespaced form.
 */
export function createDlqTopic(topic: string): string {
  if (topic.startsWith('stayflexi.')) return `${topic}.dlq`
  return `stayflexi.${topic}.dlq`
}

/** Helper: derive retry topic name — stayflexi.<topic>.retry */
export function createRetryTopic(topic: string): string {
  if (topic.startsWith('stayflexi.')) return `${topic}.retry`
  return `stayflexi.${topic}.retry`
}

/** Backwards-compatible helper: bare "<topic>.dlq" (legacy naming). */
export function createLegacyDlqTopic(topic: string): string {
  return `${topic}.dlq`
}

export function createLegacyRetryTopic(topic: string): string {
  return `${topic}.retry`
}

/** Exponential backoff delay for a given attempt (1-indexed). */
export function getRetryDelayMs(attempt: number): number {
  return BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1)
}

/** Extract retryCount from Kafka message headers (defaults to 0). */
export function getRetryCountFromHeaders(headers: Record<string, string> | undefined): number {
  if (!headers) return 0
  const raw = headers['retryCount'] ?? headers['retry-count'] ?? headers['x-retry-count']
  if (!raw) return 0
  const n = parseInt(raw, 10)
  return Number.isNaN(n) ? 0 : n
}

/**
 * Publishes a failed event to its dead-letter topic.
 * Uses namespaced topic stayflexi.<originalTopic>.dlq by default.
 */
export async function publishToDLQ(
  publisher: IEventPublisher,
  originalTopic: string,
  originalPayload: unknown,
  failureReason: string,
  meta: { eventId?: string; correlationId?: string; attemptCount?: number } = {},
): Promise<void> {
  const dlqTopic = createDlqTopic(originalTopic)
  const now = new Date().toISOString()
  const dlqPayload: DLQMessage = {
    originalTopic,
    originalPayload:
      typeof originalPayload === 'string' ? originalPayload : JSON.stringify(originalPayload),
    failureReason,
    attemptCount: meta.attemptCount ?? 1,
    firstFailedAt: now,
    lastFailedAt: now,
    eventId: meta.eventId,
    correlationId: meta.correlationId,
  }
  await publisher.publish(dlqTopic, {
    eventType: 'dlq.message',
    aggregateId: meta.eventId ?? 'unknown',
    aggregateType: 'DLQ',
    organizationId: 'system',
    payload: dlqPayload,
    correlationId: meta.correlationId,
  })
  // Also publish to legacy topic for consumers still subscribed to "<topic>.dlq"
  const legacyDlq = createLegacyDlqTopic(originalTopic)
  if (legacyDlq !== dlqTopic) {
    await publisher
      .publish(legacyDlq, {
        eventType: 'dlq.message',
        aggregateId: meta.eventId ?? 'unknown',
        aggregateType: 'DLQ',
        organizationId: 'system',
        payload: dlqPayload,
        correlationId: meta.correlationId,
      })
      .catch(() => undefined)
  }
}

/**
 * Publishes a failed event to its retry topic (stayflexi.<topic>.retry)
 * with headers retryCount and firstFailedAt. Used for intermediate retries.
 */
export async function publishToRetry(
  publisher: IEventPublisher,
  originalTopic: string,
  originalPayload: string,
  failureReason: string,
  retryCount: number,
  meta: { eventId?: string; correlationId?: string; firstFailedAt?: string } = {},
): Promise<void> {
  const retryTopic = createRetryTopic(originalTopic)
  const now = new Date().toISOString()
  const firstFailedAt = meta.firstFailedAt ?? now
  // Publish to retry topic — the envelope is the original payload re-wrapped
  // We publish via the low-level publisher so headers are preserved; here we
  // piggy-back on eventType 'retry.message' for observability.
  await publisher.publish(retryTopic, {
    eventType: 'retry.message',
    aggregateId: meta.eventId ?? 'unknown',
    aggregateType: 'RETRY',
    organizationId: 'system',
    payload: {
      originalTopic,
      originalPayload,
      failureReason,
      retryCount,
      firstFailedAt,
      lastFailedAt: now,
      eventId: meta.eventId,
      correlationId: meta.correlationId,
    },
    correlationId: meta.correlationId,
  })
  // Legacy retry topic
  const legacyRetry = createLegacyRetryTopic(originalTopic)
  if (legacyRetry !== retryTopic) {
    await publisher
      .publish(legacyRetry, {
        eventType: 'retry.message',
        aggregateId: meta.eventId ?? 'unknown',
        aggregateType: 'RETRY',
        organizationId: 'system',
        payload: {
          originalTopic,
          originalPayload,
          failureReason,
          retryCount,
          firstFailedAt,
          lastFailedAt: now,
          eventId: meta.eventId,
          correlationId: meta.correlationId,
        },
        correlationId: meta.correlationId,
      })
      .catch(() => undefined)
  }
}

/**
 * Retry-safe Kafka consumer helper with integrated DLQ routing.
 * Wraps eachMessage with try/catch + configurable retry logic.
 * After maxAttempts failures, routes to the DLQ topic.
 */
export class KafkaDLQConsumer {
  private consumer: Consumer

  constructor(
    private readonly kafka: Kafka,
    private readonly groupId: string,
    private readonly topics: string[],
    private readonly publisher: IEventPublisher,
    private readonly maxAttempts = 3,
  ) {
    this.consumer = kafka.consumer({
      groupId,
      retry: { retries: 0 }, // Manual retry control
    })
  }

  async start(
    handler: (topic: string, payload: unknown, headers: Record<string, string>) => Promise<void>,
    onError?: (err: unknown, topic: string, rawValue: string) => void,
  ): Promise<void> {
    await this.consumer.connect()
    await this.consumer.subscribe({ topics: this.topics, fromBeginning: false })

    await this.consumer.run({
      eachMessage: async ({ topic, message }: EachMessagePayload) => {
        const rawValue = message.value?.toString() ?? ''
        const correlationId = message.headers?.['correlation-id']?.toString()
        const eventId = message.headers?.['event-id']?.toString()

        let payload: unknown
        try {
          payload = JSON.parse(rawValue)
        } catch {
          payload = rawValue
        }

        // Respect incoming retryCount header from retry topics
        const incomingRetry = getRetryCountFromHeaders(
          (() => {
            const h: Record<string, string> = {}
            for (const [k, v] of Object.entries(message.headers ?? {})) h[k] = v?.toString() ?? ''
            return h
          })(),
        )
        const firstFailedAtHeader = message.headers?.['first-failed-at']?.toString()

        let lastError: unknown
        let attemptOffset = incomingRetry
        for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
          const effectiveAttempt = attemptOffset + attempt
          try {
            const headers: Record<string, string> = {}
            for (const [k, v] of Object.entries(message.headers ?? {})) {
              headers[k] = v?.toString() ?? ''
            }
            // Expose retry metadata to handler for idempotency / logging
            headers['retryCount'] = String(effectiveAttempt - 1)
            headers['firstFailedAt'] = firstFailedAtHeader ?? ''
            await handler(topic, payload, headers)
            return // success — exit retry loop
          } catch (err) {
            lastError = err
            const reason = err instanceof Error ? err.message : String(err)
            // Intermediate failure => publish to retry topic, else eventually DLQ
            if (effectiveAttempt < MAX_RETRIES) {
              try {
                await publishToRetry(this.publisher, topic, rawValue, reason, effectiveAttempt, {
                  eventId,
                  correlationId,
                  firstFailedAt: firstFailedAtHeader ?? new Date().toISOString(),
                })
              } catch (retryErr) {
                onError?.(retryErr, topic, rawValue)
              }
              // Exponential backoff: 200ms, 400ms, 800ms...
              await new Promise((r) => setTimeout(r, 200 * Math.pow(2, effectiveAttempt - 1)))
            } else if (attempt < this.maxAttempts) {
              // Still within this batch but already at max retries — just backoff
              await new Promise((r) => setTimeout(r, 200 * Math.pow(2, effectiveAttempt - 1)))
            }
          }
        }

        // All attempts exhausted — route to DLQ
        const reason = lastError instanceof Error ? lastError.message : String(lastError)
        try {
          await publishToDLQ(this.publisher, topic, rawValue, reason, {
            eventId,
            correlationId,
            attemptCount: incomingRetry + this.maxAttempts,
          })
        } catch (dlqErr) {
          // DLQ publish failure is non-fatal — the consumer must not crash
          onError?.(dlqErr, topic, rawValue)
        }
      },
    })
  }

  async stop(): Promise<void> {
    await this.consumer.disconnect()
  }
}
