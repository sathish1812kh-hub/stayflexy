// FILE: src/modules/booking/repositories/PrismaBookingGuestRepository.ts
import { type Prisma } from "@prisma/client";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import { BookingGuestRepository, type CreateBookingGuestData } from "./index";
import type { BookingGuest, GovIdType } from "../types";

type PrismaBookingGuestRecord = Prisma.BookingGuestGetPayload<Record<string, never>>;

function toBookingGuest(r: PrismaBookingGuestRecord): BookingGuest {
  return {
    id: r.id,
    bookingId: r.bookingId,
    isPrimary: r.isPrimary,
    firstName: r.firstName,
    lastName: r.lastName,
    email: r.email ?? null,
    phone: r.phone ?? null,
    nationality: r.nationality ?? null,
    governmentIdType: (r.governmentIdType ?? null) as GovIdType | null,
    governmentIdNumber: r.governmentIdNumber ?? null,
    dateOfBirth: r.dateOfBirth ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaBookingGuestRepository extends BookingGuestRepository {
  async findById(id: string): Promise<Nullable<BookingGuest>> {
    const r = await this.db.bookingGuest.findFirst({ where: { id } });
    return r ? toBookingGuest(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<BookingGuest>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.bookingGuest.findMany({
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.bookingGuest.count(),
    ]);
    return { data: records.map(toBookingGuest), meta: this.buildPaginationMeta(total, params) };
  }

  async create(data: CreateBookingGuestData): Promise<BookingGuest> {
    const r = await this.db.bookingGuest.create({
      data: {
        bookingId: data.bookingId,
        isPrimary: data.isPrimary,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email ?? null,
        phone: data.phone ?? null,
        nationality: data.nationality ?? null,
        governmentIdType: (data.governmentIdType ?? null) as PrismaBookingGuestRecord["governmentIdType"],
        governmentIdNumber: data.governmentIdNumber ?? null,
        dateOfBirth: data.dateOfBirth ?? null,
      },
    });
    return toBookingGuest(r);
  }

  async update(id: string, data: Partial<BookingGuest>): Promise<BookingGuest> {
    const payload: Prisma.BookingGuestUpdateInput = {};
    if (data.firstName !== undefined) payload.firstName = data.firstName;
    if (data.lastName !== undefined) payload.lastName = data.lastName;
    if (data.email !== undefined) payload.email = data.email;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.nationality !== undefined) payload.nationality = data.nationality;
    if (data.governmentIdType !== undefined)
      payload.governmentIdType = data.governmentIdType as PrismaBookingGuestRecord["governmentIdType"];
    if (data.governmentIdNumber !== undefined) payload.governmentIdNumber = data.governmentIdNumber;
    if (data.dateOfBirth !== undefined) payload.dateOfBirth = data.dateOfBirth;

    const r = await this.db.bookingGuest.update({ where: { id }, data: payload });
    return toBookingGuest(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.bookingGuest.delete({ where: { id } });
  }

  async findByBooking(bookingId: string): Promise<BookingGuest[]> {
    const records = await this.db.bookingGuest.findMany({
      where: { bookingId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });
    return records.map(toBookingGuest);
  }

  async findPrimary(bookingId: string): Promise<Nullable<BookingGuest>> {
    const r = await this.db.bookingGuest.findFirst({
      where: { bookingId, isPrimary: true },
    });
    return r ? toBookingGuest(r) : null;
  }
}
