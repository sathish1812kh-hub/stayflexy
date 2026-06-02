export const EVENT_TYPES = {
  BOOKING_CREATED: "booking.created",
  BOOKING_CANCELLED: "booking.cancelled",
  BOOKING_CHECKED_IN: "booking.checked_in",
  BOOKING_CHECKED_OUT: "booking.checked_out",
  PAYMENT_COMPLETED: "payment.completed",
  PAYMENT_REFUNDED: "payment.refunded",
  INVENTORY_UPDATED: "inventory.updated",
  OTA_SYNC_REQUESTED: "ota.sync.requested",
  OTA_RESERVATION_INGESTED: "ota.reservation.ingested",
  HOUSEKEEPING_COMPLETED: "housekeeping.completed",
  MAINTENANCE_RESOLVED: "maintenance.resolved",
  NOTIFICATION_SEND_REQUESTED: "notification.send.requested",
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
