// FILE: src/modules/booking/repositories/PrismaBookingRepository.ts
import { type Prisma } from "@prisma/client";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import { BookingRepository } from "./index";
import type {
  Booking,
  CreateBookingInput,
  BookingStatus,
  CancellationReason,
} from "../types";
import type { BookingFilterDtoType } from "../dto";

type PrismaBookingRecord = Prisma.BookingGetPayload<Record<string, never>>;

function toBooking(r: PrismaBookingRecord): Booking {
  return {
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    bookingNumber: r.bookingNumber,
    status: r.status as BookingStatus,
    source: r.source as Booking["source"],
    primaryGuestId: r.primaryGuestId ?? null,
    totalAmount: r.totalAmount.toNumber(),
    taxAmount: r.taxAmount.toNumber(),
    discountAmount: r.discountAmount.toNumber(),
    finalAmount: r.finalAmount.toNumber(),
    currency: r.currency,
    specialRequests: r.specialRequests ?? null,
    internalNotes: r.internalNotes ?? null,
    bookedById: r.bookedById,
    checkedInAt: r.checkedInAt ?? null,
    checkedInById: r.checkedInById ?? null,
    checkedOutAt: r.checkedOutAt ?? null,
    checkedOutById: r.checkedOutById ?? null,
    cancelledAt: r.cancelledAt ?? null,
    cancelledById: r.cancelledById ?? null,
    cancellationReason: (r.cancellationReason ?? null) as CancellationReason | null,
    cancellationNote: r.cancellationNote ?? null,
    deletedAt: r.deletedAt ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaBookingRepository extends BookingRepository {
  async findById(id: string): Promise<Nullable<Booking>> {
    const r = await this.db.booking.findFirst({
      where: { id, deletedAt: null },
    });
    return r ? toBooking(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<Booking>> {
    const skip = this.buildSkip(params);
    const where: Prisma.BookingWhereInput = { deletedAt: null };
    const [records, total] = await Promise.all([
      this.db.booking.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.booking.count({ where }),
    ]);
    return { data: records.map(toBooking), meta: this.buildPaginationMeta(total, params) };
  }

  async create(data: CreateBookingInput): Promise<Booking> {
    // This is handled transactionally in the service.
    // This stub satisfies the interface for non-transactional use.
    const r = await this.db.booking.create({
      data: {
        organizationId: data.organizationId,
        hotelId: data.hotelId,
        bookingNumber: `STUB-${Date.now()}`,
        status: "PENDING",
        source: data.source as PrismaBookingRecord["source"],
        currency: data.currency,
        specialRequests: data.specialRequests ?? null,
        internalNotes: data.internalNotes ?? null,
        bookedById: data.bookedById,
        totalAmount: 0,
        taxAmount: 0,
        discountAmount: 0,
        finalAmount: 0,
      },
    });
    return toBooking(r);
  }

  async update(id: string, data: Partial<Booking>): Promise<Booking> {
    const payload: Prisma.BookingUpdateInput = {};
    if (data.status !== undefined) payload.status = data.status as PrismaBookingRecord["status"];
    if (data.specialRequests !== undefined) payload.specialRequests = data.specialRequests;
    if (data.internalNotes !== undefined) payload.internalNotes = data.internalNotes;
    if (data.primaryGuestId !== undefined) payload.primaryGuestId = data.primaryGuestId;
    if (data.checkedInAt !== undefined) payload.checkedInAt = data.checkedInAt;
    if (data.checkedInById !== undefined) payload.checkedInById = data.checkedInById;
    if (data.checkedOutAt !== undefined) payload.checkedOutAt = data.checkedOutAt;
    if (data.checkedOutById !== undefined) payload.checkedOutById = data.checkedOutById;
    if (data.cancelledAt !== undefined) payload.cancelledAt = data.cancelledAt;
    if (data.cancelledById !== undefined) payload.cancelledById = data.cancelledById;
    if (data.cancellationReason !== undefined)
      payload.cancellationReason = data.cancellationReason as PrismaBookingRecord["cancellationReason"];
    if (data.cancellationNote !== undefined) payload.cancellationNote = data.cancellationNote;
    if (data.deletedAt !== undefined) payload.deletedAt = data.deletedAt;

    const r = await this.db.booking.update({ where: { id }, data: payload });
    return toBooking(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.booking.delete({ where: { id } });
  }

  async findByNumber(bookingNumber: string): Promise<Nullable<Booking>> {
    const r = await this.db.booking.findFirst({
      where: { bookingNumber, deletedAt: null },
    });
    return r ? toBooking(r) : null;
  }

  async findByHotel(
    hotelId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<Booking>> {
    const skip = this.buildSkip(params);
    const where: Prisma.BookingWhereInput = { hotelId, deletedAt: null };
    const [records, total] = await Promise.all([
      this.db.booking.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.booking.count({ where }),
    ]);
    return { data: records.map(toBooking), meta: this.buildPaginationMeta(total, params) };
  }

  async findByOrganization(
    orgId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<Booking>> {
    const skip = this.buildSkip(params);
    const where: Prisma.BookingWhereInput = { organizationId: orgId, deletedAt: null };
    const [records, total] = await Promise.all([
      this.db.booking.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.booking.count({ where }),
    ]);
    return { data: records.map(toBooking), meta: this.buildPaginationMeta(total, params) };
  }

  async findManyFiltered(
    filters: BookingFilterDtoType,
    orgId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<Booking>> {
    const skip = this.buildSkip(params);

    const where: Prisma.BookingWhereInput = {
      organizationId: orgId,
      deletedAt: null,
      ...(filters.hotelId && { hotelId: filters.hotelId }),
      ...(filters.status && { status: filters.status as PrismaBookingRecord["status"] }),
      ...(filters.source && { source: filters.source as PrismaBookingRecord["source"] }),
      ...(filters.bookingNumber && {
        bookingNumber: { contains: filters.bookingNumber, mode: "insensitive" },
      }),
      ...(filters.checkInFrom || filters.checkInTo
        ? {
            rooms: {
              some: {
                checkInDate: {
                  ...(filters.checkInFrom ? { gte: new Date(filters.checkInFrom) } : {}),
                  ...(filters.checkInTo ? { lte: new Date(filters.checkInTo) } : {}),
                },
              },
            },
          }
        : {}),
      ...(filters.guestName
        ? {
            guests: {
              some: {
                OR: [
                  {
                    firstName: {
                      contains: filters.guestName,
                      mode: "insensitive",
                    },
                  },
                  {
                    lastName: {
                      contains: filters.guestName,
                      mode: "insensitive",
                    },
                  },
                ],
              },
            },
          }
        : {}),
    };

    const [records, total] = await Promise.all([
      this.db.booking.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.booking.count({ where }),
    ]);
    return { data: records.map(toBooking), meta: this.buildPaginationMeta(total, params) };
  }

  async softDelete(id: string): Promise<void> {
    await this.db.booking.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async updateStatus(
    id: string,
    status: BookingStatus,
    extra?: Partial<Booking>
  ): Promise<Booking> {
    const payload: Prisma.BookingUpdateInput = {
      status: status as PrismaBookingRecord["status"],
    };
    if (extra?.primaryGuestId !== undefined) payload.primaryGuestId = extra.primaryGuestId;
    if (extra?.checkedInAt !== undefined) payload.checkedInAt = extra.checkedInAt;
    if (extra?.checkedInById !== undefined) payload.checkedInById = extra.checkedInById;
    if (extra?.checkedOutAt !== undefined) payload.checkedOutAt = extra.checkedOutAt;
    if (extra?.checkedOutById !== undefined) payload.checkedOutById = extra.checkedOutById;
    if (extra?.cancelledAt !== undefined) payload.cancelledAt = extra.cancelledAt;
    if (extra?.cancelledById !== undefined) payload.cancelledById = extra.cancelledById;
    if (extra?.cancellationReason !== undefined)
      payload.cancellationReason = extra.cancellationReason as PrismaBookingRecord["cancellationReason"];
    if (extra?.cancellationNote !== undefined) payload.cancellationNote = extra.cancellationNote;

    const r = await this.db.booking.update({ where: { id }, data: payload });
    return toBooking(r);
  }

  async countByHotel(hotelId: string): Promise<number> {
    return this.db.booking.count({ where: { hotelId, deletedAt: null } });
  }

  async sumRevenueByHotel(hotelId: string, from: Date, to: Date): Promise<number> {
    const result = await this.db.booking.aggregate({
      where: {
        hotelId,
        deletedAt: null,
        status: { in: ["CHECKED_OUT", "CHECKED_IN"] },
        createdAt: { gte: from, lte: to },
      },
      _sum: { finalAmount: true },
    });
    return result._sum.finalAmount?.toNumber() ?? 0;
  }
}
