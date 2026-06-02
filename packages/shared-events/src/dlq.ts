import { Kafka, Consumer, EachMessagePayload } from 'kafkajs'
import type { IEventPublisher } from './index'

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

/**
 * Publishes a failed event to its dead-letter topic ({originalTopic}.dlq).
 * Called by consumers after exhausting retries.
 */
export async function publishToDLQ(
  publisher: IEventPublisher,
  originalTopic: string,
  originalPayload: unknown,
  failureReason: string,
  meta: { eventId?: string; correlationId?: string; attemptCount?: number } = {},
): Promise<void> {
  const dlqTopic = `${originalTopic}.dlq`
  const now = new Date().toISOString()
  const dlqPayload: DLQMessage = {
    originalTopic,
    originalPayload: typeof originalPayload === 'string'
      ? originalPayload
      : JSON.stringify(originalPayload),
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

        let lastError: unknown
        for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
          try {
            const headers: Record<string, string> = {}
            for (const [k, v] of Object.entries(message.headers ?? {})) {
              headers[k] = v?.toString() ?? ''
            }
            await handler(topic, payload, headers)
            return // success — exit retry loop
          } catch (err) {
            lastError = err
            if (attempt < this.maxAttempts) {
              // Exponential backoff: 200ms, 400ms, 800ms...
              await new Promise(r => setTimeout(r, 200 * Math.pow(2, attempt - 1)))
            }
          }
        }

        // All attempts exhausted — route to DLQ
        const reason = lastError instanceof Error ? lastError.message : String(lastError)
        try {
          await publishToDLQ(this.publisher, topic, rawValue, reason, {
            eventId,
            correlationId,
            attemptCount: this.maxAttempts,
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
