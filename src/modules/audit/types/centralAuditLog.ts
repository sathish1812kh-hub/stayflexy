// Central audit log types — backed by the CentralAuditLog Prisma model.

export type AuditActionTypeType =
  | "CREATE"
  | "READ"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "EXPORT"
  | "IMPORT"
  | "APPROVE"
  | "REJECT";

export interface CentralAuditLog {
  id: string;
  organizationId: string;
  hotelId: string | null;
  entityType: string;
  entityId: string;
  actionType: AuditActionTypeType;
  performedBy: string;
  previousState: Record<string, unknown> | null;
  currentState: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface CreateAuditLogData {
  organizationId: string;
  hotelId?: string;
  entityType: string;
  entityId: string;
  actionType: AuditActionTypeType;
  performedBy: string;
  previousState?: Record<string, unknown>;
  currentState?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilter {
  organizationId?: string;
  hotelId?: string;
  entityType?: string;
  entityId?: string;
  actionType?: AuditActionTypeType;
  performedBy?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogSummary {
  entityType: string;
  entityId: string;
  totalChanges: number;
  lastActionAt: Date;
  lastActionBy: string;
}
