/**
 * Module Registry
 *
 * Central registration point for all domain modules.
 * Each module registers its public service contract here.
 * This registry is the single allowed cross-module dependency boundary —
 * modules import contracts from here, never from each other directly.
 *
 * Pattern: Prepare for future DI container (InversifyJS / tsyringe) adoption.
 * When a DI container is introduced, replace manual instantiation here
 * with container bindings while keeping the same interface tokens.
 */

export const MODULE_TOKENS = {
  AUTH: Symbol("IAuthService"),
  ORGANIZATION: Symbol("IOrganizationService"),
  HOTEL: Symbol("IHotelService"),
  ROOM: Symbol("IRoomService"),
  BOOKING: Symbol("IBookingService"),
  PAYMENT: Symbol("IPaymentService"),
  INVENTORY: Symbol("IInventoryService"),
  HOUSEKEEPING: Symbol("IHousekeepingService"),
  AUDIT: Symbol("IAuditService"),
  NOTIFICATION: Symbol("INotificationService"),
} as const;

export type ModuleToken = (typeof MODULE_TOKENS)[keyof typeof MODULE_TOKENS];

export const REGISTERED_MODULES = [
  "auth",
  "organization",
  "hotel",
  "room",
  "booking",
  "payment",
  "inventory",
  "housekeeping",
  "audit",
  "notification",
] as const;

export type RegisteredModule = (typeof REGISTERED_MODULES)[number];
