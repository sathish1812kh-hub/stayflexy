import type { PaginatedResult, PaginationParams } from "@shared-types";

export interface AuditContext {
  userId: string;
  organizationId: string;
  ipAddress: string;
  userAgent: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  userId: string;
  organizationId: string;
  before: unknown;
  after: unknown;
  timestamp: Date;
}

export interface IAuditService {
  // Named 'record' rather than 'log' to avoid collision with BaseService.log (ChildLogger)
  record(
    action: string,
    resource: string,
    resourceId: string,
    context: AuditContext,
    before: unknown,
    after: unknown
  ): Promise<void>;
  findByResource(resource: string, resourceId: string, params: PaginationParams): Promise<PaginatedResult<AuditLogEntry>>;
  findByUser(userId: string, params: PaginationParams): Promise<PaginatedResult<AuditLogEntry>>;
}
