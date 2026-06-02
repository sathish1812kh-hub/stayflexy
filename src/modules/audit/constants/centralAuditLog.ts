export const AUDIT_ERRORS = {
  LOG_NOT_FOUND: "Audit log not found",
  ACCESS_DENIED: "Access denied to audit logs",
  INVALID_DATE_RANGE: "End date must be after start date",
} as const;

export const SENSITIVE_FIELDS = [
  "password",
  "passwordHash",
  "token",
  "secret",
  "cardNumber",
  "cvv",
] as const;

export const AUDITABLE_ENTITIES = [
  "User",
  "Organization",
  "Hotel",
  "Booking",
  "Payment",
  "Invoice",
  "Room",
  "RoomType",
  "PricingRule",
  "OTAMapping",
  "HousekeepingTask",
  "MaintenanceTicket",
  "OperationalTask",
] as const;
