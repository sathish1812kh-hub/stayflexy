import { Kafka } from 'kafkajs';
export interface EventEnvelope<T = unknown> {
    eventId: string;
    eventType: string;
    aggregateId: string;
    aggregateType: string;
    organizationId: string;
    version: number;
    timestamp: string;
    correlationId?: string;
    causationId?: string;
    payload: T;
}
export interface IEventPublisher {
    publish<T>(topic: string, event: Omit<EventEnvelope<T>, 'eventId' | 'timestamp' | 'version'> & {
        version?: number;
    }): Promise<void>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
}
export declare class KafkaEventPublisher implements IEventPublisher {
    private readonly kafka;
    private readonly defaultRetries;
    private producer;
    private connected;
    constructor(kafka: Kafka, defaultRetries?: number);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    publish<T>(topic: string, event: Omit<EventEnvelope<T>, 'eventId' | 'timestamp' | 'version'> & {
        version?: number;
    }): Promise<void>;
}
export declare class NoOpEventPublisher implements IEventPublisher {
    private _connected;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    publish<T>(_topic: string, _event: Omit<EventEnvelope<T>, 'eventId' | 'timestamp' | 'version'>): Promise<void>;
}
export declare function createEventPublisher(config: {
    brokers: string;
    clientId: string;
    enabled?: boolean;
}): Promise<IEventPublisher>;
export declare const AUTH_EVENTS: {
    readonly USER_CREATED: "auth.user.created";
    readonly USER_LOGGED_IN: "auth.user.logged_in";
    readonly USER_LOGGED_OUT: "auth.user.logged_out";
    readonly USER_PASSWORD_RESET: "auth.user.password_reset";
    readonly REFRESH_TOKEN_ROTATED: "auth.refresh_token.rotated";
};
export declare const ORG_EVENTS: {
    readonly ORGANIZATION_CREATED: "organization.created";
    readonly ORGANIZATION_UPDATED: "organization.updated";
    readonly MEMBER_ADDED: "organization.member.added";
    readonly MEMBER_REMOVED: "organization.member.removed";
};
export declare const HOTEL_EVENTS: {
    readonly HOTEL_CREATED: "hotel.created";
    readonly HOTEL_UPDATED: "hotel.updated";
    readonly ROOM_TYPE_CREATED: "hotel.room_type.created";
    readonly ROOM_TYPE_UPDATED: "hotel.room_type.updated";
    readonly ROOM_CREATED: "hotel.room.created";
    readonly ROOM_UPDATED: "hotel.room.updated";
    readonly ROOM_STATUS_UPDATED: "hotel.room.status_updated";
};
export declare const BOOKING_EVENTS: {
    readonly BOOKING_CREATED: "booking.created";
    readonly BOOKING_CONFIRMED: "booking.confirmed";
    readonly BOOKING_CANCELLED: "booking.cancelled";
    readonly BOOKING_CHECKED_IN: "booking.checked_in";
    readonly BOOKING_CHECKED_OUT: "booking.checked_out";
    readonly BOOKING_NO_SHOW: "booking.no_show";
};
export declare const INVENTORY_EVENTS: {
    readonly INVENTORY_RESERVED: "inventory.reserved";
    readonly INVENTORY_RELEASED: "inventory.released";
    readonly INVENTORY_BLOCKED: "inventory.blocked";
    readonly INVENTORY_UNBLOCKED: "inventory.unblocked";
};
export type AuthEventType = (typeof AUTH_EVENTS)[keyof typeof AUTH_EVENTS];
export type OrgEventType = (typeof ORG_EVENTS)[keyof typeof ORG_EVENTS];
export type HotelEventType = (typeof HOTEL_EVENTS)[keyof typeof HOTEL_EVENTS];
export type BookingEventType = (typeof BOOKING_EVENTS)[keyof typeof BOOKING_EVENTS];
export type InventoryEventType = (typeof INVENTORY_EVENTS)[keyof typeof INVENTORY_EVENTS];
export { publishToDLQ, KafkaDLQConsumer } from './dlq';
export type { DLQMessage } from './dlq';
