import { type Prisma } from "@prisma/client";
import { BaseRepository } from "@lib/baseRepository";
import type { PaginatedResult, PaginationParams } from "@shared-types";
import type { SecurityEvent, CreateSecurityEventData, SecurityEventFilter, SecurityEventTypeType, SecuritySeverityType } from "../types";

type PrismaEvent = Prisma.SecurityEventGetPayload<Record<string, never>>;

function toEvent(r: PrismaEvent): SecurityEvent {
  return {
    id: r.id,
    organizationId: r.organizationId ?? null,
    hotelId: r.hotelId ?? null,
    userId: r.userId ?? null,
    eventType: r.eventType as SecurityEventTypeType,
    severity: r.severity as SecuritySeverityType,
    ipAddress: r.ipAddress ?? null,
    userAgent: r.userAgent ?? null,
    metadata: r.metadata as Record<string, unknown> | null,
    detectedAt: r.detectedAt,
  };
}

export class PrismaSecurityEventRepository extends BaseRepository<SecurityEvent, CreateSecurityEventData, Record<string, never>> {
  async findById(id: string): Promise<SecurityEvent | null> {
    const r = await this.db.securityEvent.findFirst({ where: { id } });
    return r ? toEvent(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<SecurityEvent>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.securityEvent.findMany({ skip, take: params.limit, orderBy: { detectedAt: "desc" } }),
      this.db.securityEvent.count(),
    ]);
    return { data: records.map(toEvent), meta: this.buildPaginationMeta(total, params) };
  }

  async findManyFiltered(filter: SecurityEventFilter): Promise<PaginatedResult<SecurityEvent>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 50;
    const params: PaginationParams = { page, limit };
    const skip = this.buildSkip(params);

    const where: Prisma.SecurityEventWhereInput = {
      ...(filter.organizationId && { organizationId: filter.organizationId }),
      ...(filter.userId && { userId: filter.userId }),
      ...(filter.eventType && { eventType: filter.eventType as PrismaEvent["eventType"] }),
      ...(filter.severity && { severity: filter.severity as PrismaEvent["severity"] }),
      ...(filter.startDate || filter.endDate ? {
        detectedAt: {
          ...(filter.startDate ? { gte: new Date(filter.startDate) } : {}),
          ...(filter.endDate ? { lte: new Date(filter.endDate + "T23:59:59.999Z") } : {}),
        },
      } : {}),
    };

    const [records, total] = await Promise.all([
      this.db.securityEvent.findMany({ where, skip, take: limit, orderBy: { detectedAt: "desc" } }),
      this.db.securityEvent.count({ where }),
    ]);
    return { data: records.map(toEvent), meta: this.buildPaginationMeta(total, params) };
  }

  async countRecentByType(userId: string, eventType: string, windowMinutes: number): Promise<number> {
    return this.db.securityEvent.count({
      where: {
        userId,
        eventType: eventType as PrismaEvent["eventType"],
        detectedAt: { gte: new Date(Date.now() - windowMinutes * 60 * 1000) },
      },
    });
  }

  async create(data: CreateSecurityEventData): Promise<SecurityEvent> {
    const r = await this.db.securityEvent.create({
      data: {
        organizationId: data.organizationId ?? null,
        hotelId: data.hotelId ?? null,
        userId: data.userId ?? null,
        eventType: data.eventType as PrismaEvent["eventType"],
        severity: (data.severity ?? "LOW") as PrismaEvent["severity"],
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    });
    return toEvent(r);
  }

  async update(_id: string, _data: Record<string, never>): Promise<SecurityEvent> {
    throw new Error("SecurityEvents are immutable");
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.securityEvent.delete({ where: { id } });
  }
}
