export type {
  DomainEvent, EventHandler, IEventBus,
  BookingCreatedPayload, BookingCancelledPayload, PaymentCompletedPayload,
  InventoryUpdatedPayload, OTASyncRequestedPayload, HousekeepingCompletedPayload,
  NotificationSendRequestedPayload,
} from "./types";
export { EVENT_TYPES } from "./constants";
export type { EventType } from "./constants";
export { InMemoryEventBus } from "./InMemoryEventBus";
export { EventPublisher } from "./publishers/EventPublisher";

import { InMemoryEventBus } from "./InMemoryEventBus";
import { EventPublisher } from "./publishers/EventPublisher";

export const eventBus = new InMemoryEventBus();
export const eventPublisher = new EventPublisher(eventBus);
