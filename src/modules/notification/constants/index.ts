export const NOTIFICATION_ERRORS = {
  NOT_FOUND: "Notification not found",
  TEMPLATE_NOT_FOUND: "Notification template not found",
  TEMPLATE_NAME_EXISTS: "Template name already exists",
  DELIVERY_IMMUTABLE: "Delivered or cancelled notifications cannot be modified",
  HOTEL_NOT_FOUND: "Hotel not found or access denied",
} as const;

export const MAX_RETRY_COUNT = 5;

export const NOTIFICATION_QUEUE_PRIORITY = {
  EMAIL: 5,
  SMS: 8,
  WHATSAPP: 7,
  IN_APP: 3,
  PUSH: 4,
} as const;

export const BOOKING_NOTIFICATION_TYPES = {
  BOOKING_CONFIRMED: "BOOKING_CONFIRMED",
  BOOKING_CANCELLED: "BOOKING_CANCELLED",
  CHECK_IN_REMINDER: "CHECK_IN_REMINDER",
  CHECK_OUT_REMINDER: "CHECK_OUT_REMINDER",
  PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
  PASSWORD_RESET: "PASSWORD_RESET",
} as const;
