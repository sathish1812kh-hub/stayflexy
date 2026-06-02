export const COMPLIANCE_ERRORS = {
  REQUEST_NOT_FOUND: "Compliance request not found",
  ALREADY_PROCESSING: "A request of this type is already being processed for this user",
  USER_NOT_FOUND: "Subject user not found",
  ACCESS_DENIED: "Access denied to this compliance request",
} as const;

export const RETENTION_DAYS = {
  FINANCIAL_RECORDS: 2555,
  BOOKING_RECORDS: 1825,
  AUDIT_LOGS: 3650,
  SECURITY_EVENTS: 365,
  GENERAL_USER_DATA: 365,
} as const;
