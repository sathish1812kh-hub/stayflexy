// FILE: src/modules/audit/repositories/index.ts
import { BaseRepository } from "@lib/baseRepository";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type { AuditLog, CreateAuditLogData, AuditAction, AuditResource } from "../types";

export abstract class AuditLogRepository extends BaseRepository<
  AuditLog,
  CreateAuditLogData,
  never
> {
  abstract override findById(id: string): Promise<Nullable<AuditLog>>;

  abstract override findMany(
    params: PaginationParams
  ): Promise<PaginatedResult<AuditLog>>;

  abstract override create(data: CreateAuditLogData): Promise<AuditLog>;

  override update(_id: string, _data: never): Promise<AuditLog> {
    throw new Error("Audit logs are immutable");
  }

  override hardDelete(_id: string): Promise<void> {
    throw new Error("Audit logs are immutable");
  }

  abstract findByResource(
    resource: AuditResource,
    resourceId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<AuditLog>>;

  abstract findByUser(
    userId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<AuditLog>>;

  abstract findByOrganization(
    organizationId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<AuditLog>>;

  abstract findByAction(
    action: AuditAction,
    params: PaginationParams
  ): Promise<PaginatedResult<AuditLog>>;

  abstract findByDateRange(
    from: Date,
    to: Date,
    params: PaginationParams
  ): Promise<PaginatedResult<AuditLog>>;

  abstract countByResource(resource: AuditResource): Promise<number>;
}
