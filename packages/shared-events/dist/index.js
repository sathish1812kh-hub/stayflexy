"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaDLQConsumer = exports.publishToDLQ = exports.INVENTORY_EVENTS = exports.BOOKING_EVENTS = exports.HOTEL_EVENTS = exports.ORG_EVENTS = exports.AUTH_EVENTS = exports.NoOpEventPublisher = exports.KafkaEventPublisher = void 0;
exports.createEventPublisher = createEventPublisher;
const kafkajs_1 = require("kafkajs");
const crypto_1 = require("crypto");
// Kafka implementation using kafkajs
class KafkaEventPublisher {
    kafka;
    defaultRetries;
    producer;
    connected = false;
    constructor(kafka, defaultRetries = 3) {
        this.kafka = kafka;
        this.defaultRetries = defaultRetries;
        this.producer = kafka.producer({
            idempotent: true,
            retry: {
                retries: this.defaultRetries,
                initialRetryTime: 100,
                factor: 2,
            },
        });
        this.producer.on('producer.connect', () => {
            this.connected = true;
        });
        this.producer.on('producer.disconnect', () => {
            this.connected = false;
        });
    }
    async connect() {
        await this.producer.connect();
        this.connected = true;
    }
    async disconnect() {
        await this.producer.disconnect();
        this.connected = false;
    }
    isConnected() {
        return this.connected;
    }
    async publish(topic, event) {
        const envelope = {
            ...event,
            eventId: (0, crypto_1.randomUUID)(),
            timestamp: new Date().toISOString(),
            version: event.version ?? 1,
        };
        await this.producer.send({
            topic,
            compression: kafkajs_1.CompressionTypes.GZIP,
            messages: [
                {
                    key: envelope.aggregateId,
                    value: JSON.stringify(envelope),
                    headers: {
                        'event-type': envelope.eventType,
                        'correlation-id': envelope.correlationId ?? '',
                        'content-type': 'application/json',
                    },
                },
            ],
        });
    }
}
exports.KafkaEventPublisher = KafkaEventPublisher;
// No-op publisher for fallback/testing
class NoOpEventPublisher {
    _connected = false;
    async connect() {
        this._connected = true;
    }
    async disconnect() {
        this._connected = false;
    }
    isConnected() {
        return this._connected;
    }
    async publish(_topic, _event) {
        // No-op: log would go here in real impl
    }
}
exports.NoOpEventPublisher = NoOpEventPublisher;
// Factory that gracefully falls back to NoOp if Kafka is unavailable
async function createEventPublisher(config) {
    if (config.enabled === false)
        return new NoOpEventPublisher();
    const kafka = new kafkajs_1.Kafka({
        clientId: config.clientId,
        brokers: config.brokers.split(',').map((b) => b.trim()),
        retry: { retries: 3, initialRetryTime: 1000 },
        connectionTimeout: 5000,
        requestTimeout: 30000,
    });
    const publisher = new KafkaEventPublisher(kafka);
    try {
        await publisher.connect();
        return publisher;
    }
    catch (err) {
        // Kafka not available — use no-op fallback (service still boots)
        console.warn('[shared-events] Kafka unavailable, using NoOp publisher:', String(err));
        return new NoOpEventPublisher();
    }
}
// Auth event types
exports.AUTH_EVENTS = {
    USER_CREATED: 'auth.user.created',
    USER_LOGGED_IN: 'auth.user.logged_in',
    USER_LOGGED_OUT: 'auth.user.logged_out',
    USER_PASSWORD_RESET: 'auth.user.password_reset',
    REFRESH_TOKEN_ROTATED: 'auth.refresh_token.rotated',
};
// Organization event types
exports.ORG_EVENTS = {
    ORGANIZATION_CREATED: 'organization.created',
    ORGANIZATION_UPDATED: 'organization.updated',
    MEMBER_ADDED: 'organization.member.added',
    MEMBER_REMOVED: 'organization.member.removed',
};
// Hotel event types
exports.HOTEL_EVENTS = {
    HOTEL_CREATED: 'hotel.created',
    HOTEL_UPDATED: 'hotel.updated',
    ROOM_TYPE_CREATED: 'hotel.room_type.created',
    ROOM_TYPE_UPDATED: 'hotel.room_type.updated',
    ROOM_CREATED: 'hotel.room.created',
    ROOM_UPDATED: 'hotel.room.updated',
    ROOM_STATUS_UPDATED: 'hotel.room.status_updated',
};
// Booking event types
exports.BOOKING_EVENTS = {
    BOOKING_CREATED: 'booking.created',
    BOOKING_CONFIRMED: 'booking.confirmed',
    BOOKING_CANCELLED: 'booking.cancelled',
    BOOKING_CHECKED_IN: 'booking.checked_in',
    BOOKING_CHECKED_OUT: 'booking.checked_out',
    BOOKING_NO_SHOW: 'booking.no_show',
};
// Inventory event types
exports.INVENTORY_EVENTS = {
    INVENTORY_RESERVED: 'inventory.reserved',
    INVENTORY_RELEASED: 'inventory.released',
    INVENTORY_BLOCKED: 'inventory.blocked',
    INVENTORY_UNBLOCKED: 'inventory.unblocked',
};
// Dead-letter queue support
var dlq_1 = require("./dlq");
Object.defineProperty(exports, "publishToDLQ", { enumerable: true, get: function () { return dlq_1.publishToDLQ; } });
Object.defineProperty(exports, "KafkaDLQConsumer", { enumerable: true, get: function () { return dlq_1.KafkaDLQConsumer; } });
