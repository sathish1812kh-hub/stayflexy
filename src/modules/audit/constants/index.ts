// FILE: src/modules/audit/constants/index.ts
import type { AuditAction, AuditResource } from "../types";

export const AUDIT_ACTIONS: AuditAction[] = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "EXPORT",
  "APPROVE",
  "REJECT",
  "ASSIGN",
  "CANCEL",
];

export const AUDIT_RESOURCES: AuditResource[] = [
  "USER",
  "ORGANIZATION",
  "HOTEL",
  "ROOM",
  "BOOKING",
  "PAYMENT",
  "INVENTORY",
  "HOUSEKEEPING_TASK",
  "RATE_PLAN",
  "NOTIFICATION",
];

export const AUDIT_RETENTION_DAYS = 365;

export const MAX_AUDIT_QUERY_RANGE_DAYS = 90;

export const SENSITIVE_FIELDS_TO_REDACT: string[] = [
  "passwordHash",
  "token",
  "cardNumber",
  "cvv",
  "refreshToken",
  "accessToken",
  "secret",
  "apiKey",
];

export const AUDIT_ERRORS = {
  LOG_NOT_FOUND: "Audit log entry not found",
  QUERY_RANGE_TOO_LARGE: `Query range cannot exceed ${MAX_AUDIT_QUERY_RANGE_DAYS} days`,
  IMMUTABLE: "Audit logs are immutable and cannot be modified",
} as const;
