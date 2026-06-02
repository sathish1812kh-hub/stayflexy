// FILE: src/modules/audit/types/index.ts
import type { Nullable, TimestampFields } from "@shared-types";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "EXPORT"
  | "APPROVE"
  | "REJECT"
  | "ASSIGN"
  | "CANCEL";

export type AuditResource =
  | "USER"
  | "ORGANIZATION"
  | "HOTEL"
  | "ROOM"
  | "BOOKING"
  | "PAYMENT"
  | "INVENTORY"
  | "HOUSEKEEPING_TASK"
  | "RATE_PLAN"
  | "NOTIFICATION";

export interface AuditLog extends TimestampFields {
  id: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId: string;
  userId: string;
  organizationId: string;
  ipAddress: string;
  userAgent: string;
  before: Nullable<unknown>;
  after: Nullable<unknown>;
  duration: Nullable<number>;
  success: boolean;
  errorMessage: Nullable<string>;
}

export interface CreateAuditLogData {
  action: AuditAction;
  resource: AuditResource;
  resourceId: string;
  userId: string;
  organizationId: string;
  ipAddress: string;
  userAgent: string;
  before: Nullable<unknown>;
  after: Nullable<unknown>;
  duration: Nullable<number>;
  success: boolean;
  errorMessage: Nullable<string>;
}

export interface AuditFilter {
  userId?: string;
  organizationId?: string;
  resource?: AuditResource;
  action?: AuditAction;
  resourceId?: string;
  success?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}
