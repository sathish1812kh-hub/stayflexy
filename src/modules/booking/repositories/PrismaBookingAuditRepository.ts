// FILE: src/modules/booking/repositories/PrismaBookingAuditRepository.ts
import { Prisma } from "@prisma/client";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import { BookingAuditRepository, type CreateBookingAuditData } from "./index";
import type { BookingAudit, BookingAuditEvent } from "../types";

type PrismaBookingAuditRecord = Prisma.BookingAuditGetPayload<Record<string, never>>;

function toBookingAudit(r: PrismaBookingAuditRecord): BookingAudit {
  return {
    id: r.id,
    bookingId: r.bookingId,
    eventType: r.eventType as BookingAuditEvent,
    eventDescription: r.eventDescription,
    performedById: r.performedById,
    metadata: r.metadata ?? null,
    createdAt: r.createdAt,
  };
}

export class PrismaBookingAuditRepository extends BookingAuditRepository {
  async findById(id: string): Promise<Nullable<BookingAudit>> {
    const r = await this.db.bookingAudit.findFirst({ where: { id } });
    return r ? toBookingAudit(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<BookingAudit>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.bookingAudit.findMany({
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.bookingAudit.count(),
    ]);
    return { data: records.map(toBookingAudit), meta: this.buildPaginationMeta(total, params) };
  }

  async create(data: CreateBookingAuditData): Promise<BookingAudit> {
    const r = await this.db.bookingAudit.create({
      data: {
        bookingId: data.bookingId,
        eventType: data.eventType as PrismaBookingAuditRecord["eventType"],
        eventDescription: data.eventDescription,
        performedById: data.performedById,
        metadata: (data.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
    return toBookingAudit(r);
  }

  async findByBooking(bookingId: string): Promise<BookingAudit[]> {
    const records = await this.db.bookingAudit.findMany({
      where: { bookingId },
      orderBy: { createdAt: "asc" },
    });
    return records.map(toBookingAudit);
  }

  async logEvent(
    bookingId: string,
    event: BookingAuditEvent,
    description: string,
    performedById: string,
    metadata?: unknown
  ): Promise<BookingAudit> {
    return this.create({
      bookingId,
      eventType: event,
      eventDescription: description,
      performedById,
      metadata,
    });
  }
}
