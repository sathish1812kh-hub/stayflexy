import { BaseService } from "@lib/baseService";
import { NotFoundError, ForbiddenError, ConflictError } from "@errors/HttpError";
import type { PaginatedResult } from "@shared-types";
import type { PrismaComplianceRequestRepository } from "../repositories/PrismaComplianceRequestRepository";
import type { ComplianceRequest, ComplianceRequestStatusType } from "../types";
import type { CreateComplianceRequestDtoType, ComplianceFilterDtoType } from "../dto";
import { COMPLIANCE_ERRORS, RETENTION_DAYS } from "../constants";
import { RetentionPolicy } from "../policies/RetentionPolicy";

export class ComplianceService extends BaseService {
  protected readonly moduleName = "ComplianceService";

  constructor(private readonly repo: PrismaComplianceRequestRepository) {
    super();
  }

  async createExportRequest(
    dto: CreateComplianceRequestDtoType,
    requestedBy: string,
    orgId: string
  ): Promise<ComplianceRequest> {
    return this.execute("createExportRequest", async () => {
      await this.assertNoDuplicate(dto.subjectUserId, "DATA_EXPORT");
      const req = await this.repo.create({
        organizationId: orgId,
        requestType: "DATA_EXPORT",
        requestedBy,
        subjectUserId: dto.subjectUserId,
        notes: dto.notes,
      });
      this.getLogger().info("Data export request created", { requestId: req.id, subjectUserId: dto.subjectUserId });
      return req;
    });
  }

  async createDeletionRequest(
    dto: CreateComplianceRequestDtoType,
    requestedBy: string,
    orgId: string
  ): Promise<ComplianceRequest> {
    return this.execute("createDeletionRequest", async () => {
      await this.assertNoDuplicate(dto.subjectUserId, "DATA_DELETION");
      const req = await this.repo.create({
        organizationId: orgId,
        requestType: "DATA_DELETION",
        requestedBy,
        subjectUserId: dto.subjectUserId,
        notes: dto.notes,
      });
      this.getLogger().info("Data deletion request created", { requestId: req.id, subjectUserId: dto.subjectUserId });
      return req;
    });
  }

  async getRequest(id: string, orgId: string): Promise<ComplianceRequest> {
    return this.execute("getRequest", async () => {
      return this.requireInOrg(id, orgId);
    });
  }

  async listRequests(
    filter: ComplianceFilterDtoType,
    orgId: string
  ): Promise<PaginatedResult<ComplianceRequest>> {
    return this.execute("listRequests", async () => {
      return this.repo.findManyFiltered({
        organizationId: orgId,
        requestType: filter.requestType,
        requestStatus: filter.requestStatus,
        requestedBy: filter.requestedBy,
        page: filter.page,
        limit: filter.limit,
      });
    });
  }

  async updateRequestStatus(
    id: string,
    status: ComplianceRequestStatusType,
    orgId: string,
    resultPayload?: Record<string, unknown>
  ): Promise<ComplianceRequest> {
    return this.execute("updateRequestStatus", async () => {
      await this.requireInOrg(id, orgId);
      const isTerminal = status === "COMPLETED" || status === "FAILED" || status === "CANCELLED";
      return this.repo.update(id, {
        requestStatus: status,
        resultPayload,
        processedAt: isTerminal ? new Date() : undefined,
      });
    });
  }

  getRetentionSchedule() {
    return RetentionPolicy.getSchedules();
  }

  getRetentionSummary(): Record<string, { retentionDays: number; deleteBefore: string }> {
    const schedules = RetentionPolicy.getSchedules();
    return Object.fromEntries(
      schedules.map((s) => [
        s.category,
        { retentionDays: s.retentionDays, deleteBefore: s.deleteBefore.toISOString() },
      ])
    );
  }

  getRetentionConstants() {
    return RETENTION_DAYS;
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async requireInOrg(id: string, orgId: string): Promise<ComplianceRequest> {
    const req = await this.repo.findById(id);
    if (!req) throw new NotFoundError(COMPLIANCE_ERRORS.REQUEST_NOT_FOUND);
    if (req.organizationId !== orgId) throw new ForbiddenError(COMPLIANCE_ERRORS.ACCESS_DENIED);
    return req;
  }

  private async assertNoDuplicate(subjectUserId: string, requestType: string): Promise<void> {
    const existing = await this.repo.findActiveForUser(subjectUserId, requestType);
    if (existing) throw new ConflictError(COMPLIANCE_ERRORS.ALREADY_PROCESSING);
  }
}
