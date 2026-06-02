"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaDLQConsumer = void 0;
exports.publishToDLQ = publishToDLQ;
/**
 * Publishes a failed event to its dead-letter topic ({originalTopic}.dlq).
 * Called by consumers after exhausting retries.
 */
async function publishToDLQ(publisher, originalTopic, originalPayload, failureReason, meta = {}) {
    const dlqTopic = `${originalTopic}.dlq`;
    const now = new Date().toISOString();
    const dlqPayload = {
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
    };
    await publisher.publish(dlqTopic, {
        eventType: 'dlq.message',
        aggregateId: meta.eventId ?? 'unknown',
        aggregateType: 'DLQ',
        organizationId: 'system',
        payload: dlqPayload,
        correlationId: meta.correlationId,
    });
}
/**
 * Retry-safe Kafka consumer helper with integrated DLQ routing.
 * Wraps eachMessage with try/catch + configurable retry logic.
 * After maxAttempts failures, routes to the DLQ topic.
 */
class KafkaDLQConsumer {
    kafka;
    groupId;
    topics;
    publisher;
    maxAttempts;
    consumer;
    constructor(kafka, groupId, topics, publisher, maxAttempts = 3) {
        this.kafka = kafka;
        this.groupId = groupId;
        this.topics = topics;
        this.publisher = publisher;
        this.maxAttempts = maxAttempts;
        this.consumer = kafka.consumer({
            groupId,
            retry: { retries: 0 }, // Manual retry control
        });
    }
    async start(handler, onError) {
        await this.consumer.connect();
        await this.consumer.subscribe({ topics: this.topics, fromBeginning: false });
        await this.consumer.run({
            eachMessage: async ({ topic, message }) => {
                const rawValue = message.value?.toString() ?? '';
                const correlationId = message.headers?.['correlation-id']?.toString();
                const eventId = message.headers?.['event-id']?.toString();
                let payload;
                try {
                    payload = JSON.parse(rawValue);
                }
                catch {
                    payload = rawValue;
                }
                let lastError;
                for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
                    try {
                        const headers = {};
                        for (const [k, v] of Object.entries(message.headers ?? {})) {
                            headers[k] = v?.toString() ?? '';
                        }
                        await handler(topic, payload, headers);
                        return; // success — exit retry loop
                    }
                    catch (err) {
                        lastError = err;
                        if (attempt < this.maxAttempts) {
                            // Exponential backoff: 200ms, 400ms, 800ms...
                            await new Promise(r => setTimeout(r, 200 * Math.pow(2, attempt - 1)));
                        }
                    }
                }
                // All attempts exhausted — route to DLQ
                const reason = lastError instanceof Error ? lastError.message : String(lastError);
                try {
                    await publishToDLQ(this.publisher, topic, rawValue, reason, {
                        eventId,
                        correlationId,
                        attemptCount: this.maxAttempts,
                    });
                }
                catch (dlqErr) {
                    // DLQ publish failure is non-fatal — the consumer must not crash
                    onError?.(dlqErr, topic, rawValue);
                }
            },
        });
    }
    async stop() {
        await this.consumer.disconnect();
    }
}
exports.KafkaDLQConsumer = KafkaDLQConsumer;
