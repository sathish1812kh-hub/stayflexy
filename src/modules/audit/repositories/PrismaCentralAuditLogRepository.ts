import type { Prisma, AuditActionType } from "@prisma/client";
import { BaseRepository } from "@lib/baseRepository";
import type { PaginatedResult, PaginationParams } from "@shared-types";
import type {
  CentralAuditLog,
  CreateAuditLogData,
  AuditLogFilter,
  AuditActionTypeType,
} from "../types/centralAuditLog";

type PrismaCentralAuditLog = Prisma.CentralAuditLogGetPayload<Record<string, never>>;

function toJsonOrNull(
  value: Prisma.JsonValue | null | undefined
): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function toAuditLog(r: PrismaCentralAuditLog): CentralAuditLog {
  return {
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    entityType: r.entityType,
    entityId: r.entityId,
    actionType: r.actionType as AuditActionTypeType,
    performedBy: r.performedBy,
    previousState: toJsonOrNull(r.previousState),
    currentState: toJsonOrNull(r.currentState),
    ipAddress: r.ipAddress,
    userAgent: r.userAgent,
    metadata: toJsonOrNull(r.metadata),
    createdAt: r.createdAt,
  };
}

export class PrismaCentralAuditLogRepository extends BaseRepository<
  CentralAuditLog,
  CreateAuditLogData,
  Record<string, never>
> {
  async findById(id: string): Promise<CentralAuditLog | null> {
    const r = await this.db.centralAuditLog.findUnique({ where: { id } });
    return r ? toAuditLog(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<CentralAuditLog>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.centralAuditLog.findMany({
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.centralAuditLog.count(),
    ]);
    return {
      data: records.map(toAuditLog),
      meta: this.buildPaginationMeta(total, params),
    };
  }

  async findManyFiltered(
    filter: AuditLogFilter
  ): Promise<PaginatedResult<CentralAuditLog>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 50;
    const params: PaginationParams = { page, limit };
    const skip = this.buildSkip(params);

    const where: Prisma.CentralAuditLogWhereInput = {};

    if (filter.organizationId !== undefined) {
      where.organizationId = filter.organizationId;
    }
    if (filter.hotelId !== undefined) {
      where.hotelId = filter.hotelId;
    }
    if (filter.entityType !== undefined) {
      where.entityType = filter.entityType;
    }
    if (filter.entityId !== undefined) {
      where.entityId = filter.entityId;
    }
    if (filter.actionType !== undefined) {
      where.actionType = filter.actionType as AuditActionType;
    }
    if (filter.performedBy !== undefined) {
      where.performedBy = filter.performedBy;
    }
    if (filter.startDate !== undefined || filter.endDate !== undefined) {
      where.createdAt = {};
      if (filter.startDate !== undefined) {
        where.createdAt.gte = new Date(filter.startDate);
      }
      if (filter.endDate !== undefined) {
        where.createdAt.lte = new Date(filter.endDate);
      }
    }

    const [records, total] = await Promise.all([
      this.db.centralAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.centralAuditLog.count({ where }),
    ]);

    return {
      data: records.map(toAuditLog),
      meta: this.buildPaginationMeta(total, params),
    };
  }

  async findByEntity(
    entityType: string,
    entityId: string
  ): Promise<CentralAuditLog[]> {
    const records = await this.db.centralAuditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "desc" },
    });
    return records.map(toAuditLog);
  }

  async create(data: CreateAuditLogData): Promise<CentralAuditLog> {
    const r = await this.db.centralAuditLog.create({
      data: {
        organizationId: data.organizationId,
        hotelId: data.hotelId ?? null,
        entityType: data.entityType,
        entityId: data.entityId,
        actionType: data.actionType as AuditActionType,
        performedBy: data.performedBy,
        previousState: data.previousState
          ? (data.previousState as Prisma.InputJsonValue)
          : undefined,
        currentState: data.currentState
          ? (data.currentState as Prisma.InputJsonValue)
          : undefined,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        metadata: data.metadata
          ? (data.metadata as Prisma.InputJsonValue)
          : undefined,
      },
    });
    return toAuditLog(r);
  }

  update(_id: string, _data: Record<string, never>): Promise<CentralAuditLog> {
    throw new Error("AuditLogs are immutable");
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.centralAuditLog.delete({ where: { id } });
  }
}
