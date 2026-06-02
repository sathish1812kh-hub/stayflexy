import { type Prisma } from "@prisma/client";
import { BaseRepository } from "@lib/baseRepository";
import type { PaginatedResult, PaginationParams } from "@shared-types";
import type { ComplianceRequest, CreateComplianceRequestData, ComplianceFilter, ComplianceRequestTypeType, ComplianceRequestStatusType } from "../types";

type PrismaReq = Prisma.ComplianceRequestGetPayload<Record<string, never>>;

function toRequest(r: PrismaReq): ComplianceRequest {
  return {
    id: r.id, organizationId: r.organizationId,
    requestType: r.requestType as ComplianceRequestTypeType,
    requestStatus: r.requestStatus as ComplianceRequestStatusType,
    requestedBy: r.requestedBy, subjectUserId: r.subjectUserId,
    notes: r.notes ?? null,
    resultPayload: r.resultPayload as Record<string, unknown> | null,
    processedAt: r.processedAt ?? null,
    createdAt: r.createdAt, updatedAt: r.updatedAt,
  };
}

export class PrismaComplianceRequestRepository extends BaseRepository<
  ComplianceRequest,
  CreateComplianceRequestData,
  { requestStatus?: ComplianceRequestStatusType; resultPayload?: Record<string, unknown>; processedAt?: Date }
> {
  async findById(id: string): Promise<ComplianceRequest | null> {
    const r = await this.db.complianceRequest.findFirst({ where: { id } });
    return r ? toRequest(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<ComplianceRequest>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.complianceRequest.findMany({ skip, take: params.limit, orderBy: { createdAt: "desc" } }),
      this.db.complianceRequest.count(),
    ]);
    return { data: records.map(toRequest), meta: this.buildPaginationMeta(total, params) };
  }

  async findManyFiltered(filter: ComplianceFilter): Promise<PaginatedResult<ComplianceRequest>> {
    const page = filter.page ?? 1; const limit = filter.limit ?? 20;
    const params: PaginationParams = { page, limit };
    const skip = this.buildSkip(params);
    const where: Prisma.ComplianceRequestWhereInput = {
      ...(filter.organizationId && { organizationId: filter.organizationId }),
      ...(filter.requestType && { requestType: filter.requestType as PrismaReq["requestType"] }),
      ...(filter.requestStatus && { requestStatus: filter.requestStatus as PrismaReq["requestStatus"] }),
      ...(filter.requestedBy && { requestedBy: filter.requestedBy }),
    };
    const [records, total] = await Promise.all([
      this.db.complianceRequest.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      this.db.complianceRequest.count({ where }),
    ]);
    return { data: records.map(toRequest), meta: this.buildPaginationMeta(total, params) };
  }

  async findActiveForUser(subjectUserId: string, requestType: string): Promise<ComplianceRequest | null> {
    const r = await this.db.complianceRequest.findFirst({
      where: { subjectUserId, requestType: requestType as PrismaReq["requestType"], requestStatus: { in: ["PENDING", "PROCESSING"] } },
    });
    return r ? toRequest(r) : null;
  }

  async create(data: CreateComplianceRequestData): Promise<ComplianceRequest> {
    const r = await this.db.complianceRequest.create({
      data: { organizationId: data.organizationId, requestType: data.requestType as PrismaReq["requestType"], requestedBy: data.requestedBy, subjectUserId: data.subjectUserId, notes: data.notes ?? null },
    });
    return toRequest(r);
  }

  async update(id: string, data: { requestStatus?: ComplianceRequestStatusType; resultPayload?: Record<string, unknown>; processedAt?: Date }): Promise<ComplianceRequest> {
    const payload: Prisma.ComplianceRequestUpdateInput = {};
    if (data.requestStatus) payload.requestStatus = data.requestStatus as PrismaReq["requestStatus"];
    if (data.resultPayload) payload.resultPayload = data.resultPayload as Prisma.InputJsonValue;
    if (data.processedAt) payload.processedAt = data.processedAt;
    const r = await this.db.complianceRequest.update({ where: { id }, data: payload });
    return toRequest(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.complianceRequest.delete({ where: { id } });
  }
}
