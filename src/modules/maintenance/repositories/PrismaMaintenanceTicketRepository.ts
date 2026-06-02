// FILE: src/modules/maintenance/repositories/PrismaMaintenanceTicketRepository.ts
import { type Prisma, type MaintenanceSeverity, type MaintenanceTicketStatus } from "@prisma/client";
import { BaseRepository } from "@lib/baseRepository";
import type { PaginatedResult, PaginationParams, Nullable } from "@shared-types";
import type {
  MaintenanceTicket,
  CreateMaintenanceTicketData,
  UpdateMaintenanceTicketData,
  MaintenanceTicketFilter,
  MaintenanceSeverityType,
  MaintenanceTicketStatusType,
} from "../types";

// ─── Prisma payload type ──────────────────────────────────────────────────────

type PrismaTicket = Prisma.MaintenanceTicketGetPayload<Record<string, never>>;

// ─── Internal mapper ──────────────────────────────────────────────────────────

function toTicket(r: PrismaTicket): MaintenanceTicket {
  return {
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    roomId: r.roomId,
    issueType: r.issueType,
    severity: r.severity as MaintenanceSeverityType,
    ticketStatus: r.ticketStatus as MaintenanceTicketStatusType,
    reportedBy: r.reportedBy,
    assignedTo: r.assignedTo ?? null,
    reportedAt: r.reportedAt,
    resolvedAt: r.resolvedAt ?? null,
    resolutionNotes: r.resolutionNotes ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class PrismaMaintenanceTicketRepository extends BaseRepository<
  MaintenanceTicket,
  CreateMaintenanceTicketData,
  UpdateMaintenanceTicketData
> {
  // ─── BaseRepository required methods ───────────────────────────────────────

  async findById(id: string): Promise<Nullable<MaintenanceTicket>> {
    const r = await this.db.maintenanceTicket.findFirst({ where: { id } });
    return r ? toTicket(r) : null;
  }

  async findMany(
    params: PaginationParams
  ): Promise<PaginatedResult<MaintenanceTicket>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.maintenanceTicket.findMany({
        skip,
        take: params.limit,
        orderBy: { reportedAt: "desc" },
      }),
      this.db.maintenanceTicket.count(),
    ]);
    return {
      data: records.map(toTicket),
      meta: this.buildPaginationMeta(total, params),
    };
  }

  async create(data: CreateMaintenanceTicketData): Promise<MaintenanceTicket> {
    const r = await this.db.maintenanceTicket.create({
      data: {
        organizationId: data.organizationId,
        hotelId: data.hotelId,
        roomId: data.roomId,
        issueType: data.issueType,
        severity: data.severity as MaintenanceSeverity,
        reportedBy: data.reportedBy,
        ticketStatus: "OPEN" as MaintenanceTicketStatus,
      },
    });
    return toTicket(r);
  }

  async update(
    id: string,
    data: UpdateMaintenanceTicketData
  ): Promise<MaintenanceTicket> {
    const payload: Prisma.MaintenanceTicketUpdateInput = {};
    if (data.assignedTo !== undefined) payload.assignedTo = data.assignedTo;
    if (data.ticketStatus !== undefined)
      payload.ticketStatus = data.ticketStatus as MaintenanceTicketStatus;
    if (data.resolvedAt !== undefined) payload.resolvedAt = data.resolvedAt;
    if (data.resolutionNotes !== undefined)
      payload.resolutionNotes = data.resolutionNotes;
    if (data.severity !== undefined)
      payload.severity = data.severity as MaintenanceSeverity;

    const r = await this.db.maintenanceTicket.update({
      where: { id },
      data: payload,
    });
    return toTicket(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.maintenanceTicket.delete({ where: { id } });
  }

  // ─── Additional domain methods ─────────────────────────────────────────────

  async findManyFiltered(
    filter: MaintenanceTicketFilter
  ): Promise<PaginatedResult<MaintenanceTicket>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.MaintenanceTicketWhereInput = {};
    if (filter.organizationId !== undefined)
      where.organizationId = filter.organizationId;
    if (filter.hotelId !== undefined) where.hotelId = filter.hotelId;
    if (filter.roomId !== undefined) where.roomId = filter.roomId;
    if (filter.severity !== undefined)
      where.severity = filter.severity as MaintenanceSeverity;
    if (filter.ticketStatus !== undefined)
      where.ticketStatus = filter.ticketStatus as MaintenanceTicketStatus;
    if (filter.assignedTo !== undefined) where.assignedTo = filter.assignedTo;

    const [records, total] = await Promise.all([
      this.db.maintenanceTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { reportedAt: "desc" },
      }),
      this.db.maintenanceTicket.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: records.map(toTicket),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOpenByRoom(roomId: string): Promise<MaintenanceTicket[]> {
    const records = await this.db.maintenanceTicket.findMany({
      where: {
        roomId,
        ticketStatus: {
          notIn: ["RESOLVED", "CLOSED"],
        },
      },
      orderBy: { reportedAt: "desc" },
    });
    return records.map(toTicket);
  }

  async updateStatus(
    id: string,
    status: MaintenanceTicketStatusType,
    extra?: {
      resolvedAt?: Date;
      resolutionNotes?: string;
      assignedTo?: string;
    }
  ): Promise<MaintenanceTicket> {
    const payload: Prisma.MaintenanceTicketUpdateInput = {
      ticketStatus: status as MaintenanceTicketStatus,
    };
    if (extra?.resolvedAt !== undefined) payload.resolvedAt = extra.resolvedAt;
    if (extra?.resolutionNotes !== undefined)
      payload.resolutionNotes = extra.resolutionNotes;
    if (extra?.assignedTo !== undefined) payload.assignedTo = extra.assignedTo;

    const r = await this.db.maintenanceTicket.update({
      where: { id },
      data: payload,
    });
    return toTicket(r);
  }
}
