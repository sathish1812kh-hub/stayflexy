// FILE: src/modules/booking/repositories/PrismaBookingRoomRepository.ts
import { type Prisma } from "@prisma/client";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import { BookingRoomRepository, type CreateBookingRoomData } from "./index";
import type { BookingRoom, BookingRoomStatus } from "../types";

type PrismaBookingRoomRecord = Prisma.BookingRoomGetPayload<Record<string, never>>;

function toBookingRoom(r: PrismaBookingRoomRecord): BookingRoom {
  return {
    id: r.id,
    bookingId: r.bookingId,
    roomId: r.roomId,
    roomTypeId: r.roomTypeId,
    hotelId: r.hotelId,
    checkInDate: r.checkInDate,
    checkOutDate: r.checkOutDate,
    nightCount: r.nightCount,
    adultCount: r.adultCount,
    childCount: r.childCount,
    roomRate: r.roomRate.toNumber(),
    totalRoomAmount: r.totalRoomAmount.toNumber(),
    status: r.status as BookingRoomStatus,
    specialRequests: r.specialRequests ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaBookingRoomRepository extends BookingRoomRepository {
  async findById(id: string): Promise<Nullable<BookingRoom>> {
    const r = await this.db.bookingRoom.findFirst({ where: { id } });
    return r ? toBookingRoom(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<BookingRoom>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.bookingRoom.findMany({ skip, take: params.limit, orderBy: { createdAt: "desc" } }),
      this.db.bookingRoom.count(),
    ]);
    return { data: records.map(toBookingRoom), meta: this.buildPaginationMeta(total, params) };
  }

  async create(data: CreateBookingRoomData): Promise<BookingRoom> {
    const r = await this.db.bookingRoom.create({
      data: {
        bookingId: data.bookingId,
        roomId: data.roomId,
        roomTypeId: data.roomTypeId,
        hotelId: data.hotelId,
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
        nightCount: data.nightCount,
        adultCount: data.adultCount,
        childCount: data.childCount,
        roomRate: data.roomRate,
        totalRoomAmount: data.totalRoomAmount,
        status: data.status as PrismaBookingRoomRecord["status"],
        specialRequests: data.specialRequests ?? null,
      },
    });
    return toBookingRoom(r);
  }

  async update(id: string, data: Partial<BookingRoom>): Promise<BookingRoom> {
    const payload: Prisma.BookingRoomUpdateInput = {};
    if (data.status !== undefined)
      payload.status = data.status as PrismaBookingRoomRecord["status"];
    if (data.specialRequests !== undefined) payload.specialRequests = data.specialRequests;

    const r = await this.db.bookingRoom.update({ where: { id }, data: payload });
    return toBookingRoom(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.bookingRoom.delete({ where: { id } });
  }

  async findByBooking(bookingId: string): Promise<BookingRoom[]> {
    const records = await this.db.bookingRoom.findMany({
      where: { bookingId },
      orderBy: { createdAt: "asc" },
    });
    return records.map(toBookingRoom);
  }

  async findByRoom(
    roomId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<BookingRoom>> {
    const skip = this.buildSkip(params);
    const where: Prisma.BookingRoomWhereInput = { roomId };
    const [records, total] = await Promise.all([
      this.db.bookingRoom.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.bookingRoom.count({ where }),
    ]);
    return { data: records.map(toBookingRoom), meta: this.buildPaginationMeta(total, params) };
  }

  async hasOverlap(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    excludeBookingId?: string
  ): Promise<boolean> {
    const count = await this.db.bookingRoom.count({
      where: {
        roomId,
        status: { notIn: ["CANCELLED"] },
        booking: {
          status: { notIn: ["CANCELLED"] },
          ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        },
        // Overlap: existing.checkIn < requested.checkOut AND existing.checkOut > requested.checkIn
        checkOutDate: { gt: checkIn },
        checkInDate: { lt: checkOut },
      },
    });
    return count > 0;
  }

  async updateStatus(id: string, status: BookingRoomStatus): Promise<BookingRoom> {
    const r = await this.db.bookingRoom.update({
      where: { id },
      data: { status: status as PrismaBookingRoomRecord["status"] },
    });
    return toBookingRoom(r);
  }
}
