// ─── Domain Event Envelope ────────────────────────────────────────────────────

export interface DomainEvent<T> {
  /** UUID v4 unique identifier for this event */
  eventId: string;
  /** Dot-notation event type, e.g. "booking.created" */
  eventType: string;
  /** ID of the aggregate this event belongs to */
  aggregateId: string;
  /** Type of the aggregate, e.g. "Booking" */
  aggregateType: string;
  /** Tenant / organisation this event belongs to */
  organizationId: string;
  /** ISO 8601 timestamp when the event occurred */
  timestamp: string;
  /** Schema version for forward-compatibility */
  version: number;
  /** Distributed-tracing correlation ID */
  correlationId?: string;
  /** ID of the upstream event that caused this one */
  causationId?: string;
  /** Domain-specific event data */
  payload: T;
  /** Arbitrary key/value bag for cross-cutting concerns */
  metadata?: Record<string, unknown>;
}

// ─── Payload types ────────────────────────────────────────────────────────────

export interface BookingCreatedPayload {
  bookingId: string;
  bookingNumber: string;
  hotelId: string;
  roomIds: string[];
  primaryGuestName: string;
  checkIn: string;
  checkOut: string;
  nightCount: number;
  totalAmount: number;
  currency: string;
  source: string;
  bookedById: string;
}

export interface BookingCancelledPayload {
  bookingId: string;
  hotelId: string;
  cancellationReason: string;
  cancelledById: string;
  refundAmount?: number;
  currency: string;
}

export interface BookingCheckedInPayload {
  bookingId: string;
  hotelId: string;
  roomIds: string[];
  checkedInAt: string;
  checkedInById: string;
}

export interface BookingCheckedOutPayload {
  bookingId: string;
  hotelId: string;
  roomIds: string[];
  checkedOutAt: string;
  checkedOutById: string;
}

export interface PaymentCompletedPayload {
  paymentId: string;
  bookingId: string;
  hotelId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  transactionId?: string;
  paidAt: string;
}

export interface PaymentFailedPayload {
  paymentId: string;
  bookingId: string;
  amount: number;
  currency: string;
  failureReason: string;
}

export interface InventoryReservedPayload {
  roomId: string;
  hotelId: string;
  bookingId: string;
  checkInDate: string;
  checkOutDate: string;
}

export interface InventoryReleasedPayload {
  roomId: string;
  hotelId: string;
  bookingId?: string;
  checkInDate: string;
  checkOutDate: string;
  reason: string;
}

export interface OtaSyncCompletedPayload {
  syncJobId: string;
  hotelId: string;
  providerId: string;
  syncType: string;
  recordsProcessed: number;
  recordsFailed: number;
  durationMs: number;
}

export interface NotificationSentPayload {
  notificationId: string;
  recipientId: string;
  channel: string;
  templateId?: string;
  subject?: string;
  sentAt: string;
}

export interface UserRegisteredPayload {
  userId: string;
  email: string;
  organizationId: string;
  primaryRole: string;
}

export interface HotelCreatedPayload {
  hotelId: string;
  organizationId: string;
  hotelName: string;
  city: string;
  country: string;
}

// ─── Typed event aliases ──────────────────────────────────────────────────────

export type BookingCreatedEvent = DomainEvent<BookingCreatedPayload>;
export type BookingCancelledEvent = DomainEvent<BookingCancelledPayload>;
export type BookingCheckedInEvent = DomainEvent<BookingCheckedInPayload>;
export type BookingCheckedOutEvent = DomainEvent<BookingCheckedOutPayload>;
export type PaymentCompletedEvent = DomainEvent<PaymentCompletedPayload>;
export type PaymentFailedEvent = DomainEvent<PaymentFailedPayload>;
export type InventoryReservedEvent = DomainEvent<InventoryReservedPayload>;
export type InventoryReleasedEvent = DomainEvent<InventoryReleasedPayload>;
export type OtaSyncCompletedEvent = DomainEvent<OtaSyncCompletedPayload>;
export type NotificationSentEvent = DomainEvent<NotificationSentPayload>;
export type UserRegisteredEvent = DomainEvent<UserRegisteredPayload>;
export type HotelCreatedEvent = DomainEvent<HotelCreatedPayload>;

// ─── Event type constants ─────────────────────────────────────────────────────

export const EVENT_TYPES = {
  BOOKING_CREATED: 'booking.created',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_CHECKED_IN: 'booking.checked_in',
  BOOKING_CHECKED_OUT: 'booking.checked_out',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  INVENTORY_RESERVED: 'inventory.reserved',
  INVENTORY_RELEASED: 'inventory.released',
  OTA_SYNC_COMPLETED: 'ota.sync.completed',
  NOTIFICATION_SENT: 'notification.sent',
  USER_REGISTERED: 'user.registered',
  HOTEL_CREATED: 'hotel.created',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
