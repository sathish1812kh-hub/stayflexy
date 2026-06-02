import { BaseService } from "@lib/baseService";
import { NotFoundError } from "@errors/HttpError";
import type { PaginatedResult } from "@shared-types";
import type { PrismaCentralAuditLogRepository } from "../repositories/PrismaCentralAuditLogRepository";
import type {
  CentralAuditLog,
  CreateAuditLogData,
} from "../types/centralAuditLog";
import type { AuditLogFilterDtoType } from "../dto/centralAuditLog";
import { AuditMasker } from "../utils/AuditMasker";
import { AUDIT_ERRORS } from "../constants/centralAuditLog";

export class AuditService extends BaseService {
  protected readonly moduleName = "AuditService";

  constructor(
    private readonly auditRepo: PrismaCentralAuditLogRepository
  ) {
    super();
  }

  /**
   * Creates an immutable audit log entry after masking sensitive state fields.
   */
  async createLog(data: CreateAuditLogData): Promise<CentralAuditLog> {
    return this.execute("createLog", async () => {
      const masked: CreateAuditLogData = {
        ...data,
        previousState:
          data.previousState !== undefined
            ? AuditMasker.maskState(data.previousState)
            : undefined,
        currentState:
          data.currentState !== undefined
            ? AuditMasker.maskState(data.currentState)
            : undefined,
      };
      return this.auditRepo.create(masked);
    });
  }

  /**
   * Lists audit logs for the calling organisation, with optional filters.
   */
  async listLogs(
    filter: AuditLogFilterDtoType,
    orgId: string
  ): Promise<PaginatedResult<CentralAuditLog>> {
    return this.execute("listLogs", async () => {
      return this.auditRepo.findManyFiltered({
        ...filter,
        organizationId: orgId,
      });
    });
  }

  /**
   * Returns the full change history for a single entity, ordered by newest first.
   * Access control is enforced at the route level via RBAC.
   */
  async getEntityHistory(
    entityType: string,
    entityId: string,
    _orgId: string
  ): Promise<CentralAuditLog[]> {
    return this.execute("getEntityHistory", async () => {
      return this.auditRepo.findByEntity(entityType, entityId);
    });
  }

  /**
   * Fetches a single audit log entry by ID. Throws NotFoundError if absent.
   */
  async getLog(id: string): Promise<CentralAuditLog> {
    return this.execute("getLog", async () => {
      const record = await this.auditRepo.findById(id);
      if (record === null) {
        throw new NotFoundError(AUDIT_ERRORS.LOG_NOT_FOUND);
      }
      return record;
    });
  }
}
