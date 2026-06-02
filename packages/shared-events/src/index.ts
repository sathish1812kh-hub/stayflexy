import { Kafka, Producer, CompressionTypes } from 'kafkajs'
import { randomUUID } from 'crypto'

export interface EventEnvelope<T = unknown> {
  eventId: string
  eventType: string
  aggregateId: string
  aggregateType: string
  organizationId: string
  version: number
  timestamp: string
  correlationId?: string
  causationId?: string
  payload: T
}

export interface IEventPublisher {
  publish<T>(
    topic: string,
    event: Omit<EventEnvelope<T>, 'eventId' | 'timestamp' | 'version'> & {
      version?: number
    }
  ): Promise<void>
  connect(): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
}

// Kafka implementation using kafkajs
export class KafkaEventPublisher implements IEventPublisher {
  private producer: Producer
  private connected = false

  constructor(
    private readonly kafka: Kafka,
    private readonly defaultRetries = 3
  ) {
    this.producer = kafka.producer({
      idempotent: true,
      retry: {
        retries: this.defaultRetries,
        initialRetryTime: 100,
        factor: 2,
      },
    })
    this.producer.on('producer.connect', () => {
      this.connected = true
    })
    this.producer.on('producer.disconnect', () => {
      this.connected = false
    })
  }

  async connect(): Promise<void> {
    await this.producer.connect()
    this.connected = true
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect()
    this.connected = false
  }

  isConnected(): boolean {
    return this.connected
  }

  async publish<T>(
    topic: string,
    event: Omit<EventEnvelope<T>, 'eventId' | 'timestamp' | 'version'> & {
      version?: number
    }
  ): Promise<void> {
    const envelope: EventEnvelope<T> = {
      ...event,
      eventId: randomUUID(),
      timestamp: new Date().toISOString(),
      version: event.version ?? 1,
    }
    await this.producer.send({
      topic,
      compression: CompressionTypes.GZIP,
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
    })
  }
}

// No-op publisher for fallback/testing
export class NoOpEventPublisher implements IEventPublisher {
  private _connected = false

  async connect(): Promise<void> {
    this._connected = true
  }

  async disconnect(): Promise<void> {
    this._connected = false
  }

  isConnected(): boolean {
    return this._connected
  }

  async publish<T>(
    _topic: string,
    _event: Omit<EventEnvelope<T>, 'eventId' | 'timestamp' | 'version'>
  ): Promise<void> {
    // No-op: log would go here in real impl
  }
}

// Factory that gracefully falls back to NoOp if Kafka is unavailable
export async function createEventPublisher(config: {
  brokers: string
  clientId: string
  enabled?: boolean
}): Promise<IEventPublisher> {
  if (config.enabled === false) return new NoOpEventPublisher()

  const kafka = new Kafka({
    clientId: config.clientId,
    brokers: config.brokers.split(',').map((b) => b.trim()),
    retry: { retries: 3, initialRetryTime: 1000 },
    connectionTimeout: 5000,
    requestTimeout: 30000,
  })

  const publisher = new KafkaEventPublisher(kafka)
  try {
    await publisher.connect()
    return publisher
  } catch (err) {
    // Kafka not available — use no-op fallback (service still boots)
    console.warn(
      '[shared-events] Kafka unavailable, using NoOp publisher:',
      String(err)
    )
    return new NoOpEventPublisher()
  }
}

// Auth event types
export const AUTH_EVENTS = {
  USER_CREATED: 'auth.user.created',
  USER_LOGGED_IN: 'auth.user.logged_in',
  USER_LOGGED_OUT: 'auth.user.logged_out',
  USER_PASSWORD_RESET: 'auth.user.password_reset',
  REFRESH_TOKEN_ROTATED: 'auth.refresh_token.rotated',
} as const

// Organization event types
export const ORG_EVENTS = {
  ORGANIZATION_CREATED: 'organization.created',
  ORGANIZATION_UPDATED: 'organization.updated',
  MEMBER_ADDED: 'organization.member.added',
  MEMBER_REMOVED: 'organization.member.removed',
} as const

// Hotel event types
export const HOTEL_EVENTS = {
  HOTEL_CREATED: 'hotel.created',
  HOTEL_UPDATED: 'hotel.updated',
  ROOM_TYPE_CREATED: 'hotel.room_type.created',
  ROOM_TYPE_UPDATED: 'hotel.room_type.updated',
  ROOM_CREATED: 'hotel.room.created',
  ROOM_UPDATED: 'hotel.room.updated',
  ROOM_STATUS_UPDATED: 'hotel.room.status_updated',
} as const

// Booking event types
export const BOOKING_EVENTS = {
  BOOKING_CREATED: 'booking.created',
  BOOKING_CONFIRMED: 'booking.confirmed',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_CHECKED_IN: 'booking.checked_in',
  BOOKING_CHECKED_OUT: 'booking.checked_out',
  BOOKING_NO_SHOW: 'booking.no_show',
} as const

// Inventory event types
export const INVENTORY_EVENTS = {
  INVENTORY_RESERVED: 'inventory.reserved',
  INVENTORY_RELEASED: 'inventory.released',
  INVENTORY_BLOCKED: 'inventory.blocked',
  INVENTORY_UNBLOCKED: 'inventory.unblocked',
} as const

export type AuthEventType = (typeof AUTH_EVENTS)[keyof typeof AUTH_EVENTS]
export type OrgEventType = (typeof ORG_EVENTS)[keyof typeof ORG_EVENTS]
export type HotelEventType = (typeof HOTEL_EVENTS)[keyof typeof HOTEL_EVENTS]
export type BookingEventType = (typeof BOOKING_EVENTS)[keyof typeof BOOKING_EVENTS]
export type InventoryEventType = (typeof INVENTORY_EVENTS)[keyof typeof INVENTORY_EVENTS]

// Dead-letter queue support
export { publishToDLQ, KafkaDLQConsumer } from './dlq'
export type { DLQMessage } from './dlq'
