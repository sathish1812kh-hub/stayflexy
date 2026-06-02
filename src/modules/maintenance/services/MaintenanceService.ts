// FILE: src/modules/maintenance/services/MaintenanceService.ts
import { BaseService } from "@lib/baseService";
import { prisma } from "@lib/prisma";
import { type PrismaTransactionClient } from "@lib/baseRepository";
import type { Prisma } from "@prisma/client";
import { NotFoundError, ConflictError, ForbiddenError } from "@errors/HttpError";
import type { PaginatedResult } from "@shared-types";
import type { PrismaMaintenanceTicketRepository } from "../repositories/PrismaMaintenanceTicketRepository";
import type {
  MaintenanceTicket,
  MaintenanceTicketFilter,
  UpdateMaintenanceTicketData,
} from "../types";
import type {
  AssignTicketDtoType,
  UpdateTicketStatusDtoType,
  UpdateMaintenanceTicketDtoType,
  ResolveTicketDtoType,
  CreateMaintenanceTicketDtoType,
  MaintenanceTicketFilterDtoType,
} from "../dto";
import {
  MAINTENANCE_ERRORS,
  VALID_TICKET_TRANSITIONS,
} from "../constants";

export class MaintenanceService extends BaseService {
  protected readonly moduleName = "MaintenanceService";

  constructor(
    private readonly ticketRepo: PrismaMaintenanceTicketRepository
  ) {
    super();
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async validateHotelAccess(
    hotelId: string,
    orgId: string
  ): Promise<void> {
    const hotel = await prisma.hotel.findFirst({
      where: { id: hotelId, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!hotel) throw new ForbiddenError(MAINTENANCE_ERRORS.HOTEL_NOT_FOUND);
  }

  private async validateRoom(
    roomId: string,
    hotelId: string
  ): Promise<{ id: string }> {
    const room = await prisma.room.findFirst({
      where: { id: roomId, hotelId, deletedAt: null },
      select: { id: true },
    });
    if (!room) throw new NotFoundError(MAINTENANCE_ERRORS.ROOM_NOT_FOUND);
    return room;
  }

  // ─── createTicket ────────────────────────────────────────────────────────────

  async createTicket(
    dto: CreateMaintenanceTicketDtoType,
    userId: string,
    orgId: string
  ): Promise<MaintenanceTicket> {
    return this.execute("createTicket", async () => {
      await this.validateHotelAccess(dto.hotelId, orgId);
      await this.validateRoom(dto.roomId, dto.hotelId);

      return prisma.$transaction(async (tx: PrismaTransactionClient) => {
        // a. Create the maintenance ticket
        const ticket = await this.ticketRepo.create({
          organizationId: orgId,
          hotelId: dto.hotelId,
          roomId: dto.roomId,
          issueType: dto.issueType,
          severity: dto.severity,
          reportedBy: userId,
        });

        // b. Update room operational and maintenance status
        await tx.room.update({
          where: { id: dto.roomId },
          data: {
            operationalStatus: "UNDER_MAINTENANCE",
            maintenanceStatus: "SCHEDULED",
          },
        });

        // c. Create operational audit record
        await tx.operationalAudit.create({
          data: {
            organizationId: orgId,
            hotelId: dto.hotelId,
            entityType: "MaintenanceTicket",
            entityId: ticket.id,
            eventType: "TICKET_CREATED",
            performedBy: userId,
            eventMetadata: {
              severity: dto.severity,
              roomId: dto.roomId,
            } as Prisma.InputJsonValue,
          },
        });

        return ticket;
      });
    });
  }

  // ─── assignTicket ────────────────────────────────────────────────────────────

  async assignTicket(
    id: string,
    dto: AssignTicketDtoType,
    userId: string,
    orgId: string
  ): Promise<MaintenanceTicket> {
    return this.execute("assignTicket", async () => {
      const ticket = await this.ticketRepo.findById(id);
      if (!ticket) throw new NotFoundError(MAINTENANCE_ERRORS.TICKET_NOT_FOUND);
      if (ticket.organizationId !== orgId)
        throw new ForbiddenError(MAINTENANCE_ERRORS.HOTEL_NOT_FOUND);

      if (ticket.ticketStatus === "CLOSED") {
        throw new ConflictError(MAINTENANCE_ERRORS.TICKET_ALREADY_CLOSED);
      }
      if (ticket.ticketStatus === "RESOLVED") {
        throw new ConflictError(MAINTENANCE_ERRORS.TICKET_ALREADY_RESOLVED);
      }

      const allowed = VALID_TICKET_TRANSITIONS[ticket.ticketStatus] ?? [];
      if (!allowed.includes("ASSIGNED")) {
        throw new ConflictError(MAINTENANCE_ERRORS.INVALID_TRANSITION);
      }

      const updated = await this.ticketRepo.updateStatus(id, "ASSIGNED", {
        assignedTo: dto.assignedTo,
      });

      await prisma.operationalAudit.create({
        data: {
          organizationId: orgId,
          hotelId: ticket.hotelId,
          entityType: "MaintenanceTicket",
          entityId: id,
          eventType: "TICKET_ASSIGNED",
          performedBy: userId,
          eventMetadata: {
            assignedTo: dto.assignedTo,
          } as Prisma.InputJsonValue,
        },
      });

      return updated;
    });
  }

  // ─── updateTicketStatus ───────────────────────────────────────────────────────

  async updateTicketStatus(
    id: string,
    dto: UpdateTicketStatusDtoType,
    userId: string,
    orgId: string
  ): Promise<MaintenanceTicket> {
    return this.execute("updateTicketStatus", async () => {
      const ticket = await this.ticketRepo.findById(id);
      if (!ticket) throw new NotFoundError(MAINTENANCE_ERRORS.TICKET_NOT_FOUND);
      if (ticket.organizationId !== orgId)
        throw new ForbiddenError(MAINTENANCE_ERRORS.HOTEL_NOT_FOUND);

      if (ticket.ticketStatus === "CLOSED") {
        throw new ConflictError(MAINTENANCE_ERRORS.TICKET_ALREADY_CLOSED);
      }

      const allowed = VALID_TICKET_TRANSITIONS[ticket.ticketStatus] ?? [];
      if (!allowed.includes(dto.ticketStatus)) {
        throw new ConflictError(MAINTENANCE_ERRORS.INVALID_TRANSITION);
      }

      if (dto.ticketStatus === "RESOLVED" && !dto.resolutionNotes) {
        throw new ConflictError(MAINTENANCE_ERRORS.RESOLUTION_REQUIRED);
      }

      return prisma.$transaction(async (tx: PrismaTransactionClient) => {
        // a. Update ticket status
        const extra: {
          resolvedAt?: Date;
          resolutionNotes?: string;
        } = {};
        if (dto.ticketStatus === "RESOLVED") {
          extra.resolvedAt = new Date();
          if (dto.resolutionNotes !== undefined) {
            extra.resolutionNotes = dto.resolutionNotes;
          }
        }
        const updated = await this.ticketRepo.updateStatus(
          id,
          dto.ticketStatus,
          extra
        );

        // b. If RESOLVED or CLOSED, check whether any other open tickets remain for this room
        if (dto.ticketStatus === "RESOLVED" || dto.ticketStatus === "CLOSED") {
          const openTickets = await this.ticketRepo.findOpenByRoom(
            ticket.roomId
          );
          const otherOpen = openTickets.filter((t) => t.id !== id);
          if (otherOpen.length === 0) {
            // No other open tickets — restore room status
            await tx.room.update({
              where: { id: ticket.roomId },
              data: {
                operationalStatus: "AVAILABLE",
                maintenanceStatus: "COMPLETED",
              },
            });
          }
        }

        // c. If IN_PROGRESS, update room maintenance status
        if (dto.ticketStatus === "IN_PROGRESS") {
          await tx.room.update({
            where: { id: ticket.roomId },
            data: { maintenanceStatus: "IN_PROGRESS" },
          });
        }

        // d. Create operational audit
        await tx.operationalAudit.create({
          data: {
            organizationId: orgId,
            hotelId: ticket.hotelId,
            entityType: "MaintenanceTicket",
            entityId: id,
            eventType: "TICKET_STATUS_UPDATED",
            performedBy: userId,
            eventMetadata: {
              previousStatus: ticket.ticketStatus,
              newStatus: dto.ticketStatus,
            } as Prisma.InputJsonValue,
          },
        });

        return updated;
      });
    });
  }

  // ─── resolveTicket ────────────────────────────────────────────────────────────

  async resolveTicket(
    id: string,
    dto: ResolveTicketDtoType,
    userId: string,
    orgId: string
  ): Promise<MaintenanceTicket> {
    return this.execute("resolveTicket", async () => {
      return this.updateTicketStatus(
        id,
        { ticketStatus: "RESOLVED", resolutionNotes: dto.resolutionNotes },
        userId,
        orgId
      );
    });
  }

  // ─── updateTicket ─────────────────────────────────────────────────────────────

  async updateTicket(
    id: string,
    dto: UpdateMaintenanceTicketDtoType,
    userId: string,
    orgId: string
  ): Promise<MaintenanceTicket> {
    return this.execute("updateTicket", async () => {
      const ticket = await this.ticketRepo.findById(id);
      if (!ticket) throw new NotFoundError(MAINTENANCE_ERRORS.TICKET_NOT_FOUND);
      if (ticket.organizationId !== orgId)
        throw new ForbiddenError(MAINTENANCE_ERRORS.HOTEL_NOT_FOUND);

      if (ticket.ticketStatus === "CLOSED") {
        throw new ConflictError(MAINTENANCE_ERRORS.TICKET_ALREADY_CLOSED);
      }

      const updateData: UpdateMaintenanceTicketData = {};
      if (dto.assignedTo !== undefined) updateData.assignedTo = dto.assignedTo;
      if (dto.severity !== undefined) updateData.severity = dto.severity;
      if (dto.notes !== undefined) updateData.resolutionNotes = dto.notes;

      const updated = await this.ticketRepo.update(id, updateData);

      await prisma.operationalAudit.create({
        data: {
          organizationId: orgId,
          hotelId: ticket.hotelId,
          entityType: "MaintenanceTicket",
          entityId: id,
          eventType: "TICKET_UPDATED",
          performedBy: userId,
          eventMetadata: {
            fields: Object.keys(dto),
          } as Prisma.InputJsonValue,
        },
      });

      return updated;
    });
  }

  // ─── listTickets ──────────────────────────────────────────────────────────────

  async listTickets(
    filter: MaintenanceTicketFilterDtoType,
    orgId: string
  ): Promise<PaginatedResult<MaintenanceTicket>> {
    return this.execute("listTickets", async () => {
      await this.validateHotelAccess(filter.hotelId, orgId);

      const ticketFilter: MaintenanceTicketFilter = {
        organizationId: orgId,
        hotelId: filter.hotelId,
        roomId: filter.roomId,
        severity: filter.severity,
        ticketStatus: filter.ticketStatus,
        assignedTo: filter.assignedTo,
        page: filter.page,
        limit: filter.limit,
      };

      return this.ticketRepo.findManyFiltered(ticketFilter);
    });
  }

  // ─── getTicket ────────────────────────────────────────────────────────────────

  async getTicket(id: string, orgId: string): Promise<MaintenanceTicket> {
    return this.execute("getTicket", async () => {
      const ticket = await this.ticketRepo.findById(id);
      if (!ticket) throw new NotFoundError(MAINTENANCE_ERRORS.TICKET_NOT_FOUND);
      if (ticket.organizationId !== orgId)
        throw new ForbiddenError(MAINTENANCE_ERRORS.HOTEL_NOT_FOUND);
      return ticket;
    });
  }
}
