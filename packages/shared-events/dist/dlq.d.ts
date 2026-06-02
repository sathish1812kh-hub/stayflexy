import { Kafka } from 'kafkajs';
import type { IEventPublisher } from './index';
export interface DLQMessage {
    originalTopic: string;
    originalPayload: string;
    failureReason: string;
    attemptCount: number;
    firstFailedAt: string;
    lastFailedAt: string;
    eventId?: string;
    correlationId?: string;
}
/**
 * Publishes a failed event to its dead-letter topic ({originalTopic}.dlq).
 * Called by consumers after exhausting retries.
 */
export declare function publishToDLQ(publisher: IEventPublisher, originalTopic: string, originalPayload: unknown, failureReason: string, meta?: {
    eventId?: string;
    correlationId?: string;
    attemptCount?: number;
}): Promise<void>;
/**
 * Retry-safe Kafka consumer helper with integrated DLQ routing.
 * Wraps eachMessage with try/catch + configurable retry logic.
 * After maxAttempts failures, routes to the DLQ topic.
 */
export declare class KafkaDLQConsumer {
    private readonly kafka;
    private readonly groupId;
    private readonly topics;
    private readonly publisher;
    private readonly maxAttempts;
    private consumer;
    constructor(kafka: Kafka, groupId: string, topics: string[], publisher: IEventPublisher, maxAttempts?: number);
    start(handler: (topic: string, payload: unknown, headers: Record<string, string>) => Promise<void>, onError?: (err: unknown, topic: string, rawValue: string) => void): Promise<void>;
    stop(): Promise<void>;
}
