// FILE: src/modules/audit/services/index.ts
//
// Design note: BaseService declares `protected log!: ChildLogger`.
// IAuditService previously used `log` as its method name, causing a
// name collision in the subclass. The contract has been updated to use
// `record` instead. AuditService now directly implements IAuditService.

import { BaseService } from "@lib/baseService";
import { BadRequestError } from "@errors/HttpError";
import type {
  IAuditService,
  AuditContext,
  AuditLogEntry,
} from "@common/contracts/IAuditService";
import type { PaginatedResult, PaginationParams } from "@shared-types";
import type { AuditLogRepository } from "../repositories";
import type { AuditLog, AuditResource } from "../types";
import { MAX_AUDIT_QUERY_RANGE_DAYS, AUDIT_ERRORS } from "../constants";
import { redactSensitiveFields } from "../validators";

export class AuditService extends BaseService implements IAuditService {
  protected readonly moduleName = "AuditService";

  constructor(private readonly auditRepo: AuditLogRepository) {
    super();
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private toEntry(auditLog: AuditLog): AuditLogEntry {
    return {
      id: auditLog.id,
      action: auditLog.action,
      resource: auditLog.resource,
      resourceId: auditLog.resourceId,
      userId: auditLog.userId,
      organizationId: auditLog.organizationId,
      before: auditLog.before,
      after: auditLog.after,
      timestamp: auditLog.createdAt,
    };
  }

  private persistAuditEntry(data: {
    action: string;
    resource: string;
    resourceId: string;
    context: AuditContext;
    before: unknown;
    after: unknown;
    duration: number | null;
    success: boolean;
    errorMessage: string | null;
  }): void {
    void this.auditRepo
      .create({
        action: data.action as AuditLog["action"],
        resource: data.resource as AuditLog["resource"],
        resourceId: data.resourceId,
        userId: data.context.userId,
        organizationId: data.context.organizationId,
        ipAddress: data.context.ipAddress,
        userAgent: data.context.userAgent,
        before: redactSensitiveFields(data.before),
        after: redactSensitiveFields(data.after),
        duration: data.duration,
        success: data.success,
        errorMessage: data.errorMessage,
      })
      .catch((err: unknown) => {
        this.getLogger().error(
          "Failed to persist audit log",
          err instanceof Error ? err : undefined
        );
      });
  }

  // -------------------------------------------------------------------------
  // IAuditService implementation
  // -------------------------------------------------------------------------

  /**
   * Fire-and-forget audit record. Named `record` (not `log`) to avoid
   * shadowing the `protected log` property inherited from BaseService.
   */
  record(
    action: string,
    resource: string,
    resourceId: string,
    context: AuditContext,
    before: unknown,
    after: unknown
  ): Promise<void> {
    this.persistAuditEntry({
      action,
      resource,
      resourceId,
      context,
      before,
      after,
      duration: null,
      success: true,
      errorMessage: null,
    });
    return Promise.resolve();
  }

  async findByResource(
    resource: string,
    resourceId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<AuditLogEntry>> {
    return this.execute("findByResource", async () => {
      const result = await this.auditRepo.findByResource(
        resource as AuditResource,
        resourceId,
        params
      );
      return {
        data: result.data.map(this.toEntry.bind(this)),
        meta: result.meta,
      };
    });
  }

  async findByUser(
    userId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<AuditLogEntry>> {
    return this.execute("findByUser", async () => {
      const result = await this.auditRepo.findByUser(userId, params);
      return {
        data: result.data.map(this.toEntry.bind(this)),
        meta: result.meta,
      };
    });
  }

  // -------------------------------------------------------------------------
  // Extended service methods
  // -------------------------------------------------------------------------

  /**
   * Wraps an auditable operation with explicit timing, success, and error
   * capture. Fire-and-forget.
   */
  logWithContext(
    action: string,
    resource: string,
    resourceId: string,
    context: AuditContext,
    before: unknown,
    after: unknown,
    startTime: number,
    success: boolean,
    errorMessage?: string
  ): void {
    const duration = Date.now() - startTime;
    this.persistAuditEntry({
      action,
      resource,
      resourceId,
      context,
      before,
      after,
      duration,
      success,
      errorMessage: errorMessage ?? null,
    });
  }

  async listLogs(filter: {
    userId?: string;
    organizationId?: string;
    resource?: string;
    action?: string;
    resourceId?: string;
    success?: boolean;
    dateFrom?: string;
    dateTo?: string;
    page: number;
    limit: number;
  }): Promise<PaginatedResult<AuditLogEntry>> {
    return this.execute("listLogs", async () => {
      const params = this.buildPaginationParams(filter.page, filter.limit);

      if (filter.dateFrom && filter.dateTo) {
        const from = new Date(filter.dateFrom);
        const to = new Date(filter.dateTo);
        const diffDays =
          (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);

        if (diffDays > MAX_AUDIT_QUERY_RANGE_DAYS) {
          throw new BadRequestError(AUDIT_ERRORS.QUERY_RANGE_TOO_LARGE);
        }

        const result = await this.auditRepo.findByDateRange(from, to, params);
        return {
          data: result.data.map(this.toEntry.bind(this)),
          meta: result.meta,
        };
      }

      if (filter.resource && filter.resourceId) {
        return this.findByResource(filter.resource, filter.resourceId, params);
      }

      if (filter.userId) {
        return this.findByUser(filter.userId, params);
      }

      if (filter.organizationId) {
        const result = await this.auditRepo.findByOrganization(
          filter.organizationId,
          params
        );
        return {
          data: result.data.map(this.toEntry.bind(this)),
          meta: result.meta,
        };
      }

      const result = await this.auditRepo.findMany(params);
      return {
        data: result.data.map(this.toEntry.bind(this)),
        meta: result.meta,
      };
    });
  }
}
