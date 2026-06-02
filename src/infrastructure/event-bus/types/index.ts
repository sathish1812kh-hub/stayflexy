export interface DomainEvent<T = unknown> {
  id: string;
  eventType: string;
  payload: T;
  organizationId: string;
  occurredAt: Date;
  source: string;
  correlationId?: string;
}

export type EventHandler<T = unknown> = (event: DomainEvent<T>) => Promise<void>;

export interface IEventBus {
  publish<T>(event: Omit<DomainEvent<T>, "id" | "occurredAt">): Promise<void>;
  subscribe<T>(eventType: string, handler: EventHandler<T>): void;
  unsubscribe(eventType: string, handler: EventHandler): void;
  getHandlerCount(eventType: string): number;
}

// Typed payload interfaces for each domain event
export interface BookingCreatedPayload {
  bookingId: string;
  hotelId: string;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: number;
}

export interface BookingCancelledPayload {
  bookingId: string;
  hotelId: string;
  cancellationReason: string;
  refundAmount: number;
}

export interface PaymentCompletedPayload {
  paymentId: string;
  bookingId: string;
  hotelId: string;
  amount: number;
  paymentMethod: string;
}

export interface InventoryUpdatedPayload {
  hotelId: string;
  roomTypeId: string;
  date: string;
  availableCount: number;
  changeType: "INCREASE" | "DECREASE";
}

export interface OTASyncRequestedPayload {
  hotelId: string;
  providerId: string;
  syncType: string;
  jobId: string;
}

export interface HousekeepingCompletedPayload {
  taskId: string;
  roomId: string;
  hotelId: string;
  completedBy: string;
}

export interface NotificationSendRequestedPayload {
  notificationId: string;
  notificationType: string;
  recipient: string;
  organizationId: string;
}
