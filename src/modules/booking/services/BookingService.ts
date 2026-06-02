// FILE: src/modules/booking/services/BookingService.ts
import { BaseService } from "@lib/baseService";
import { prisma } from "@lib/prisma";
import { type PrismaTransactionClient } from "@lib/baseRepository";
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from "@errors/HttpError";
import type { PrismaInventoryRepository } from "@modules/inventory/repositories/PrismaInventoryRepository";
import type { PrismaRoomRepository } from "@modules/room/repositories/PrismaRoomRepository";
import type { PaginatedResult } from "@shared-types";
import type {
  BookingRepository,
  BookingRoomRepository,
  BookingGuestRepository,
  BookingAuditRepository,
} from "../repositories";
import type {
  Booking,
  BookingWithDetails,
  CreateBookingInput,
  BookingRoom,
  BookingGuest,
  BookingAudit,
  CancellationReason,
} from "../types";
import type { BookingFilterDtoType, AvailabilitySearchDtoType } from "../dto";
import {
  BOOKING_ERRORS,
  TAX_RATE_DEFAULT,
  VALID_TRANSITIONS,
} from "../constants";
import {
  generateBookingNumber,
  calculateNightCount,
  generateDateRange,
  calculateRoomAmount,
  toDateOnly,
} from "../utils";

// ─── Availability result type ─────────────────────────────────────────────────

export interface AvailabilityResult {
  roomTypeId: string;
  hotelId: string;
  checkInDate: Date;
  checkOutDate: Date;
  nightCount: number;
  availableRooms: number;
  basePrice: number;
  currency: string;
}

export class BookingService extends BaseService {
  protected readonly moduleName = "BookingService";

  constructor(
    private readonly bookingRepo: BookingRepository,
    private readonly bookingRoomRepo: BookingRoomRepository,
    private readonly bookingGuestRepo: BookingGuestRepository,
    private readonly bookingAuditRepo: BookingAuditRepository,
    private readonly inventoryRepo: PrismaInventoryRepository,
    private readonly roomRepo: PrismaRoomRepository
  ) {
    super();
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async validateOrgAccess(bookingId: string, orgId: string): Promise<Booking> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) throw new NotFoundError(BOOKING_ERRORS.NOT_FOUND);
    if (booking.organizationId !== orgId) throw new ForbiddenError(BOOKING_ERRORS.ACCESS_DENIED);
    return booking;
  }

  private async buildFullBooking(bookingId: string): Promise<BookingWithDetails> {
    const [booking, rooms, guests, audit] = await Promise.all([
      this.bookingRepo.findById(bookingId),
      this.bookingRoomRepo.findByBooking(bookingId),
      this.bookingGuestRepo.findByBooking(bookingId),
      this.bookingAuditRepo.findByBooking(bookingId),
    ]);
    if (!booking) throw new NotFoundError(BOOKING_ERRORS.NOT_FOUND);
    return { ...booking, rooms, guests, audit };
  }

  // ─── createBooking ────────────────────────────────────────────────────────────

  async createBooking(
    input: CreateBookingInput,
    performedById: string
  ): Promise<BookingWithDetails> {
    return this.execute("createBooking", async () => {
      return prisma.$transaction(async (tx: PrismaTransactionClient) => {
        // 1. Validate hotel
        const hotel = await tx.hotel.findFirst({
          where: {
            id: input.hotelId,
            organizationId: input.organizationId,
            deletedAt: null,
          },
          select: { id: true, status: true, operationalStatus: true, currency: true },
        });
        if (!hotel) throw new NotFoundError(BOOKING_ERRORS.HOTEL_NOT_FOUND);
        if (hotel.status !== "ACTIVE" || hotel.operationalStatus !== "OPEN") {
          throw new BadRequestError(BOOKING_ERRORS.HOTEL_NOT_OPERATIONAL);
        }

        // 2. Validate each room and collect room type info
        const roomTypeIds = [...new Set(input.rooms.map((r) => r.roomTypeId))];
        const roomTypes = await tx.roomType.findMany({
          where: { id: { in: roomTypeIds }, deletedAt: null },
          select: { id: true, basePrice: true },
        });
        const roomTypeMap = new Map(roomTypes.map((rt) => [rt.id, rt]));

        for (const roomInput of input.rooms) {
          const room = await this.roomRepo.findById(roomInput.roomId);
          if (!room || room.deletedAt !== null) {
            throw new NotFoundError(BOOKING_ERRORS.ROOM_NOT_FOUND);
          }
          if (room.hotelId !== input.hotelId) {
            throw new BadRequestError(BOOKING_ERRORS.ROOM_NOT_FOUND);
          }
          if (room.operationalStatus !== "AVAILABLE") {
            throw new ConflictError(BOOKING_ERRORS.ROOM_NOT_OPERATIONAL);
          }

          // 3. Overlap check
          const overlap = await this.bookingRoomRepo.hasOverlap(
            roomInput.roomId,
            toDateOnly(roomInput.checkInDate),
            toDateOnly(roomInput.checkOutDate)
          );
          if (overlap) {
            throw new ConflictError(BOOKING_ERRORS.ROOM_OVERLAP, {
              roomId: roomInput.roomId,
              checkInDate: roomInput.checkInDate,
              checkOutDate: roomInput.checkOutDate,
            });
          }

          // 4. Inventory check for each date in range
          const dateRange = generateDateRange(
            toDateOnly(roomInput.checkInDate),
            toDateOnly(roomInput.checkOutDate)
          );
          for (const date of dateRange) {
            const inv = await this.inventoryRepo.findByRoomTypeAndDate(
              roomInput.roomTypeId,
              date
            );
            if (!inv || inv.availableInventory <= 0) {
              throw new ConflictError(BOOKING_ERRORS.NO_AVAILABILITY, {
                roomTypeId: roomInput.roomTypeId,
                date: date.toISOString().substring(0, 10),
              });
            }
          }
        }

        // 5. Calculate amounts
        let totalAmount = 0;
        for (const roomInput of input.rooms) {
          const rt = roomTypeMap.get(roomInput.roomTypeId);
          const roomRate = rt ? rt.basePrice.toNumber() : 0;
          const nights = calculateNightCount(roomInput.checkInDate, roomInput.checkOutDate);
          totalAmount += calculateRoomAmount(roomRate, nights);
        }
        const taxAmount = Math.round(totalAmount * TAX_RATE_DEFAULT * 100) / 100;
        const discountAmount = 0;
        const finalAmount = Math.round((totalAmount + taxAmount - discountAmount) * 100) / 100;

        // 6. Generate booking number
        const bookingNumber = generateBookingNumber();

        // 7. Create Booking record
        const createdBooking = await tx.booking.create({
          data: {
            organizationId: input.organizationId,
            hotelId: input.hotelId,
            bookingNumber,
            status: "PENDING",
            source: input.source as Parameters<typeof tx.booking.create>[0]["data"]["source"],
            currency: input.currency,
            specialRequests: input.specialRequests ?? null,
            internalNotes: input.internalNotes ?? null,
            bookedById: input.bookedById,
            totalAmount,
            taxAmount,
            discountAmount,
            finalAmount,
          },
        });

        // 8. Create BookingRoom records
        const createdRooms: BookingRoom[] = [];
        for (const roomInput of input.rooms) {
          const rt = roomTypeMap.get(roomInput.roomTypeId);
          const roomRate = rt ? rt.basePrice.toNumber() : 0;
          const nights = calculateNightCount(roomInput.checkInDate, roomInput.checkOutDate);
          const totalRoomAmount = calculateRoomAmount(roomRate, nights);

          const br = await tx.bookingRoom.create({
            data: {
              bookingId: createdBooking.id,
              roomId: roomInput.roomId,
              roomTypeId: roomInput.roomTypeId,
              hotelId: input.hotelId,
              checkInDate: toDateOnly(roomInput.checkInDate),
              checkOutDate: toDateOnly(roomInput.checkOutDate),
              nightCount: nights,
              adultCount: roomInput.adultCount,
              childCount: roomInput.childCount,
              roomRate,
              totalRoomAmount,
              status: "RESERVED",
              specialRequests: roomInput.specialRequests ?? null,
            },
          });
          createdRooms.push({
            id: br.id,
            bookingId: br.bookingId,
            roomId: br.roomId,
            roomTypeId: br.roomTypeId,
            hotelId: br.hotelId,
            checkInDate: br.checkInDate,
            checkOutDate: br.checkOutDate,
            nightCount: br.nightCount,
            adultCount: br.adultCount,
            childCount: br.childCount,
            roomRate: br.roomRate.toNumber(),
            totalRoomAmount: br.totalRoomAmount.toNumber(),
            status: "RESERVED",
            specialRequests: br.specialRequests ?? null,
            createdAt: br.createdAt,
            updatedAt: br.updatedAt,
          });
        }

        // 9. Create BookingGuest records, track primary guest
        const createdGuests: BookingGuest[] = [];
        let primaryGuestId: string | null = null;

        for (const guestInput of input.guests) {
          const bg = await tx.bookingGuest.create({
            data: {
              bookingId: createdBooking.id,
              isPrimary: guestInput.isPrimary,
              firstName: guestInput.firstName,
              lastName: guestInput.lastName,
              email: guestInput.email ?? null,
              phone: guestInput.phone ?? null,
              nationality: guestInput.nationality ?? null,
              governmentIdType: (guestInput.governmentIdType ?? null) as Parameters<
                typeof tx.bookingGuest.create
              >[0]["data"]["governmentIdType"],
              governmentIdNumber: guestInput.governmentIdNumber ?? null,
              dateOfBirth: guestInput.dateOfBirth ? toDateOnly(guestInput.dateOfBirth) : null,
            },
          });
          createdGuests.push({
            id: bg.id,
            bookingId: bg.bookingId,
            isPrimary: bg.isPrimary,
            firstName: bg.firstName,
            lastName: bg.lastName,
            email: bg.email ?? null,
            phone: bg.phone ?? null,
            nationality: bg.nationality ?? null,
            governmentIdType: bg.governmentIdType as BookingGuest["governmentIdType"],
            governmentIdNumber: bg.governmentIdNumber ?? null,
            dateOfBirth: bg.dateOfBirth ?? null,
            createdAt: bg.createdAt,
            updatedAt: bg.updatedAt,
          });
          if (guestInput.isPrimary) {
            primaryGuestId = bg.id;
          }
        }

        // 10. Adjust reserved inventory for each room and each date
        for (const roomInput of input.rooms) {
          const dateRange = generateDateRange(
            toDateOnly(roomInput.checkInDate),
            toDateOnly(roomInput.checkOutDate)
          );
          for (const date of dateRange) {
            const inv = await this.inventoryRepo.findByRoomTypeAndDate(
              roomInput.roomTypeId,
              date
            );
            if (inv) {
              await this.inventoryRepo.adjustReservedInventory(inv.id, 1, tx);
            }
          }
        }

        // 11. Create audit record
        await tx.bookingAudit.create({
          data: {
            bookingId: createdBooking.id,
            eventType: "CREATED",
            eventDescription: `Booking ${bookingNumber} created`,
            performedById,
          },
        });

        // 12. Update booking.primaryGuestId
        const finalBooking = await tx.booking.update({
          where: { id: createdBooking.id },
          data: { primaryGuestId },
        });

        const auditRecords = await tx.bookingAudit.findMany({
          where: { bookingId: finalBooking.id },
          orderBy: { createdAt: "asc" },
        });

        const audit: BookingAudit[] = auditRecords.map((a) => ({
          id: a.id,
          bookingId: a.bookingId,
          eventType: a.eventType as BookingAudit["eventType"],
          eventDescription: a.eventDescription,
          performedById: a.performedById,
          metadata: a.metadata ?? null,
          createdAt: a.createdAt,
        }));

        return {
          id: finalBooking.id,
          organizationId: finalBooking.organizationId,
          hotelId: finalBooking.hotelId,
          bookingNumber: finalBooking.bookingNumber,
          status: finalBooking.status as Booking["status"],
          source: finalBooking.source as Booking["source"],
          primaryGuestId: finalBooking.primaryGuestId ?? null,
          totalAmount: finalBooking.totalAmount.toNumber(),
          taxAmount: finalBooking.taxAmount.toNumber(),
          discountAmount: finalBooking.discountAmount.toNumber(),
          finalAmount: finalBooking.finalAmount.toNumber(),
          currency: finalBooking.currency,
          specialRequests: finalBooking.specialRequests ?? null,
          internalNotes: finalBooking.internalNotes ?? null,
          bookedById: finalBooking.bookedById,
          checkedInAt: finalBooking.checkedInAt ?? null,
          checkedInById: finalBooking.checkedInById ?? null,
          checkedOutAt: finalBooking.checkedOutAt ?? null,
          checkedOutById: finalBooking.checkedOutById ?? null,
          cancelledAt: finalBooking.cancelledAt ?? null,
          cancelledById: finalBooking.cancelledById ?? null,
          cancellationReason: (finalBooking.cancellationReason ?? null) as CancellationReason | null,
          cancellationNote: finalBooking.cancellationNote ?? null,
          deletedAt: finalBooking.deletedAt ?? null,
          createdAt: finalBooking.createdAt,
          updatedAt: finalBooking.updatedAt,
          rooms: createdRooms,
          guests: createdGuests,
          audit,
        };
      });
    });
  }

  // ─── getBooking ───────────────────────────────────────────────────────────────

  async getBooking(id: string, orgId: string): Promise<BookingWithDetails> {
    return this.execute("getBooking", async () => {
      await this.validateOrgAccess(id, orgId);
      return this.buildFullBooking(id);
    });
  }

  // ─── listBookings ─────────────────────────────────────────────────────────────

  async listBookings(
    orgId: string,
    params: BookingFilterDtoType
  ): Promise<PaginatedResult<Booking>> {
    return this.execute("listBookings", async () => {
      const pagination = this.buildPaginationParams(params.page, params.limit);
      return this.bookingRepo.findManyFiltered(params, orgId, pagination);
    });
  }

  // ─── cancelBooking ────────────────────────────────────────────────────────────

  async cancelBooking(
    id: string,
    reason: CancellationReason,
    note: string | undefined,
    performedById: string,
    orgId: string
  ): Promise<Booking> {
    return this.execute("cancelBooking", async () => {
      const booking = await this.validateOrgAccess(id, orgId);

      if (!VALID_TRANSITIONS[booking.status].includes("CANCELLED")) {
        throw new BadRequestError(BOOKING_ERRORS.INVALID_STATUS_TRANSITION, {
          current: booking.status,
          attempted: "CANCELLED",
        });
      }

      return prisma.$transaction(async (tx: PrismaTransactionClient) => {
        // a. Update booking status
        const now = new Date();
        const updated = await tx.booking.update({
          where: { id },
          data: {
            status: "CANCELLED",
            cancelledAt: now,
            cancelledById: performedById,
            cancellationReason: reason as Parameters<
              typeof tx.booking.update
            >[0]["data"]["cancellationReason"],
            cancellationNote: note ?? null,
          },
        });

        // b. Release inventory and cancel rooms
        const rooms = await this.bookingRoomRepo.findByBooking(id);
        for (const room of rooms) {
          if (room.status === "CANCELLED") continue;

          const dateRange = generateDateRange(
            toDateOnly(room.checkInDate),
            toDateOnly(room.checkOutDate)
          );
          for (const date of dateRange) {
            const inv = await this.inventoryRepo.findByRoomTypeAndDate(room.roomTypeId, date);
            if (inv) {
              // Silently skip if inventory adjustments fail (booking might predate inventory)
              try {
                await this.inventoryRepo.adjustReservedInventory(inv.id, -1, tx);
              } catch {
                // Non-fatal — inventory may not match booking history
              }
            }
          }

          // c. Cancel booking room
          await tx.bookingRoom.update({
            where: { id: room.id },
            data: { status: "CANCELLED" },
          });
        }

        // d. Audit
        await tx.bookingAudit.create({
          data: {
            bookingId: id,
            eventType: "CANCELLED",
            eventDescription: `Booking cancelled. Reason: ${reason}${note ? `. Note: ${note}` : ""}`,
            performedById,
            metadata: { reason, note: note ?? null },
          },
        });

        return {
          id: updated.id,
          organizationId: updated.organizationId,
          hotelId: updated.hotelId,
          bookingNumber: updated.bookingNumber,
          status: updated.status as Booking["status"],
          source: updated.source as Booking["source"],
          primaryGuestId: updated.primaryGuestId ?? null,
          totalAmount: updated.totalAmount.toNumber(),
          taxAmount: updated.taxAmount.toNumber(),
          discountAmount: updated.discountAmount.toNumber(),
          finalAmount: updated.finalAmount.toNumber(),
          currency: updated.currency,
          specialRequests: updated.specialRequests ?? null,
          internalNotes: updated.internalNotes ?? null,
          bookedById: updated.bookedById,
          checkedInAt: updated.checkedInAt ?? null,
          checkedInById: updated.checkedInById ?? null,
          checkedOutAt: updated.checkedOutAt ?? null,
          checkedOutById: updated.checkedOutById ?? null,
          cancelledAt: updated.cancelledAt ?? null,
          cancelledById: updated.cancelledById ?? null,
          cancellationReason: (updated.cancellationReason ?? null) as CancellationReason | null,
          cancellationNote: updated.cancellationNote ?? null,
          deletedAt: updated.deletedAt ?? null,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        };
      });
    });
  }

  // ─── checkIn ─────────────────────────────────────────────────────────────────

  async checkIn(id: string, performedById: string, orgId: string): Promise<Booking> {
    return this.execute("checkIn", async () => {
      const booking = await this.validateOrgAccess(id, orgId);

      if (booking.status !== "CONFIRMED") {
        throw new BadRequestError(BOOKING_ERRORS.INVALID_STATUS_TRANSITION, {
          current: booking.status,
          attempted: "CHECKED_IN",
        });
      }

      // 2. Verify check-in date <= today for at least one room
      const rooms = await this.bookingRoomRepo.findByBooking(id);
      const today = toDateOnly(new Date());
      const canCheckIn = rooms.some((r) => toDateOnly(r.checkInDate) <= today);
      if (!canCheckIn) {
        throw new BadRequestError(BOOKING_ERRORS.CHECKIN_DATE_NOT_REACHED);
      }

      return prisma.$transaction(async (tx: PrismaTransactionClient) => {
        const now = new Date();

        // a. Update booking status
        const updated = await tx.booking.update({
          where: { id },
          data: {
            status: "CHECKED_IN",
            checkedInAt: now,
            checkedInById: performedById,
          },
        });

        // b. Update BookingRoom.status to OCCUPIED
        for (const room of rooms) {
          if (room.status === "RESERVED") {
            await tx.bookingRoom.update({
              where: { id: room.id },
              data: { status: "OCCUPIED" },
            });
          }

          // c. Update room.occupancyStatus to OCCUPIED
          await tx.room.update({
            where: { id: room.roomId },
            data: { occupancyStatus: "OCCUPIED" },
          });
        }

        // d. Create audit
        await tx.bookingAudit.create({
          data: {
            bookingId: id,
            eventType: "CHECKED_IN",
            eventDescription: `Guest checked in`,
            performedById,
          },
        });

        return {
          id: updated.id,
          organizationId: updated.organizationId,
          hotelId: updated.hotelId,
          bookingNumber: updated.bookingNumber,
          status: updated.status as Booking["status"],
          source: updated.source as Booking["source"],
          primaryGuestId: updated.primaryGuestId ?? null,
          totalAmount: updated.totalAmount.toNumber(),
          taxAmount: updated.taxAmount.toNumber(),
          discountAmount: updated.discountAmount.toNumber(),
          finalAmount: updated.finalAmount.toNumber(),
          currency: updated.currency,
          specialRequests: updated.specialRequests ?? null,
          internalNotes: updated.internalNotes ?? null,
          bookedById: updated.bookedById,
          checkedInAt: updated.checkedInAt ?? null,
          checkedInById: updated.checkedInById ?? null,
          checkedOutAt: updated.checkedOutAt ?? null,
          checkedOutById: updated.checkedOutById ?? null,
          cancelledAt: updated.cancelledAt ?? null,
          cancelledById: updated.cancelledById ?? null,
          cancellationReason: (updated.cancellationReason ?? null) as CancellationReason | null,
          cancellationNote: updated.cancellationNote ?? null,
          deletedAt: updated.deletedAt ?? null,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        };
      });
    });
  }

  // ─── checkOut ────────────────────────────────────────────────────────────────

  async checkOut(id: string, performedById: string, orgId: string): Promise<Booking> {
    return this.execute("checkOut", async () => {
      const booking = await this.validateOrgAccess(id, orgId);

      if (booking.status !== "CHECKED_IN") {
        throw new BadRequestError(BOOKING_ERRORS.INVALID_STATUS_TRANSITION, {
          current: booking.status,
          attempted: "CHECKED_OUT",
        });
      }

      const rooms = await this.bookingRoomRepo.findByBooking(id);

      return prisma.$transaction(async (tx: PrismaTransactionClient) => {
        const now = new Date();

        // a. Update booking status
        const updated = await tx.booking.update({
          where: { id },
          data: {
            status: "CHECKED_OUT",
            checkedOutAt: now,
            checkedOutById: performedById,
          },
        });

        for (const room of rooms) {
          // b. Update BookingRoom.status to VACATED
          await tx.bookingRoom.update({
            where: { id: room.id },
            data: { status: "VACATED" },
          });

          // c. Update room.occupancyStatus to VACANT
          // d. Update room.housekeepingStatus to DIRTY
          await tx.room.update({
            where: { id: room.roomId },
            data: {
              occupancyStatus: "VACANT",
              housekeepingStatus: "DIRTY",
            },
          });
        }

        // e. Create audit
        await tx.bookingAudit.create({
          data: {
            bookingId: id,
            eventType: "CHECKED_OUT",
            eventDescription: `Guest checked out`,
            performedById,
          },
        });

        return {
          id: updated.id,
          organizationId: updated.organizationId,
          hotelId: updated.hotelId,
          bookingNumber: updated.bookingNumber,
          status: updated.status as Booking["status"],
          source: updated.source as Booking["source"],
          primaryGuestId: updated.primaryGuestId ?? null,
          totalAmount: updated.totalAmount.toNumber(),
          taxAmount: updated.taxAmount.toNumber(),
          discountAmount: updated.discountAmount.toNumber(),
          finalAmount: updated.finalAmount.toNumber(),
          currency: updated.currency,
          specialRequests: updated.specialRequests ?? null,
          internalNotes: updated.internalNotes ?? null,
          bookedById: updated.bookedById,
          checkedInAt: updated.checkedInAt ?? null,
          checkedInById: updated.checkedInById ?? null,
          checkedOutAt: updated.checkedOutAt ?? null,
          checkedOutById: updated.checkedOutById ?? null,
          cancelledAt: updated.cancelledAt ?? null,
          cancelledById: updated.cancelledById ?? null,
          cancellationReason: (updated.cancellationReason ?? null) as CancellationReason | null,
          cancellationNote: updated.cancellationNote ?? null,
          deletedAt: updated.deletedAt ?? null,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        };
      });
    });
  }

  // ─── markNoShow ───────────────────────────────────────────────────────────────

  async markNoShow(id: string, performedById: string, orgId: string): Promise<Booking> {
    return this.execute("markNoShow", async () => {
      const booking = await this.validateOrgAccess(id, orgId);

      if (!VALID_TRANSITIONS[booking.status].includes("NO_SHOW")) {
        throw new BadRequestError(BOOKING_ERRORS.INVALID_STATUS_TRANSITION, {
          current: booking.status,
          attempted: "NO_SHOW",
        });
      }

      return prisma.$transaction(async (tx: PrismaTransactionClient) => {
        const updated = await tx.booking.update({
          where: { id },
          data: {
            status: "NO_SHOW",
            cancelledAt: new Date(),
            cancelledById: performedById,
            cancellationReason: "NO_SHOW",
          },
        });

        await tx.bookingAudit.create({
          data: {
            bookingId: id,
            eventType: "NO_SHOW_MARKED",
            eventDescription: `Booking marked as no-show`,
            performedById,
          },
        });

        return {
          id: updated.id,
          organizationId: updated.organizationId,
          hotelId: updated.hotelId,
          bookingNumber: updated.bookingNumber,
          status: updated.status as Booking["status"],
          source: updated.source as Booking["source"],
          primaryGuestId: updated.primaryGuestId ?? null,
          totalAmount: updated.totalAmount.toNumber(),
          taxAmount: updated.taxAmount.toNumber(),
          discountAmount: updated.discountAmount.toNumber(),
          finalAmount: updated.finalAmount.toNumber(),
          currency: updated.currency,
          specialRequests: updated.specialRequests ?? null,
          internalNotes: updated.internalNotes ?? null,
          bookedById: updated.bookedById,
          checkedInAt: updated.checkedInAt ?? null,
          checkedInById: updated.checkedInById ?? null,
          checkedOutAt: updated.checkedOutAt ?? null,
          checkedOutById: updated.checkedOutById ?? null,
          cancelledAt: updated.cancelledAt ?? null,
          cancelledById: updated.cancelledById ?? null,
          cancellationReason: (updated.cancellationReason ?? null) as CancellationReason | null,
          cancellationNote: updated.cancellationNote ?? null,
          deletedAt: updated.deletedAt ?? null,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        };
      });
    });
  }

  // ─── updateBooking ────────────────────────────────────────────────────────────

  async updateBooking(
    id: string,
    data: { specialRequests?: string; internalNotes?: string },
    performedById: string,
    orgId: string
  ): Promise<Booking> {
    return this.execute("updateBooking", async () => {
      await this.validateOrgAccess(id, orgId);

      return prisma.$transaction(async (tx: PrismaTransactionClient) => {
        const updated = await tx.booking.update({
          where: { id },
          data: {
            ...(data.specialRequests !== undefined && {
              specialRequests: data.specialRequests,
            }),
            ...(data.internalNotes !== undefined && {
              internalNotes: data.internalNotes,
            }),
          },
        });

        await tx.bookingAudit.create({
          data: {
            bookingId: id,
            eventType: "MODIFIED",
            eventDescription: `Booking updated`,
            performedById,
            metadata: { fields: Object.keys(data) },
          },
        });

        return {
          id: updated.id,
          organizationId: updated.organizationId,
          hotelId: updated.hotelId,
          bookingNumber: updated.bookingNumber,
          status: updated.status as Booking["status"],
          source: updated.source as Booking["source"],
          primaryGuestId: updated.primaryGuestId ?? null,
          totalAmount: updated.totalAmount.toNumber(),
          taxAmount: updated.taxAmount.toNumber(),
          discountAmount: updated.discountAmount.toNumber(),
          finalAmount: updated.finalAmount.toNumber(),
          currency: updated.currency,
          specialRequests: updated.specialRequests ?? null,
          internalNotes: updated.internalNotes ?? null,
          bookedById: updated.bookedById,
          checkedInAt: updated.checkedInAt ?? null,
          checkedInById: updated.checkedInById ?? null,
          checkedOutAt: updated.checkedOutAt ?? null,
          checkedOutById: updated.checkedOutById ?? null,
          cancelledAt: updated.cancelledAt ?? null,
          cancelledById: updated.cancelledById ?? null,
          cancellationReason: (updated.cancellationReason ?? null) as CancellationReason | null,
          cancellationNote: updated.cancellationNote ?? null,
          deletedAt: updated.deletedAt ?? null,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        };
      });
    });
  }

  // ─── searchAvailability ───────────────────────────────────────────────────────

  async searchAvailability(
    dto: AvailabilitySearchDtoType,
    orgId: string
  ): Promise<AvailabilityResult[]> {
    return this.execute("searchAvailability", async () => {
      // 1. Validate hotel belongs to org
      const hotel = await prisma.hotel.findFirst({
        where: { id: dto.hotelId, organizationId: orgId, deletedAt: null },
        select: { id: true, currency: true },
      });
      if (!hotel) throw new ForbiddenError(BOOKING_ERRORS.HOTEL_NOT_FOUND);

      // 2. Parse dates
      const checkInDate = toDateOnly(new Date(dto.checkInDate));
      const checkOutDate = toDateOnly(new Date(dto.checkOutDate));
      const nightCount = calculateNightCount(checkInDate, checkOutDate);

      // 3. Get date range
      const dateRange = generateDateRange(checkInDate, checkOutDate);

      // 4. Query inventory for the date range
      const inventoryRecords = await this.inventoryRepo.findByHotelAndDateRange(
        dto.hotelId,
        checkInDate,
        checkOutDate,
        dto.roomTypeId
      );

      // 5. Group by roomTypeId, compute min availability per roomType
      const availByRoomType = new Map<
        string,
        { minAvailable: number; basePrice: number; currency: string }
      >();

      for (const inv of inventoryRecords) {
        const existing = availByRoomType.get(inv.roomTypeId);
        if (!existing) {
          // Fetch room type for base price
          const rt = await prisma.roomType.findFirst({
            where: { id: inv.roomTypeId, deletedAt: null },
            select: { basePrice: true },
          });
          availByRoomType.set(inv.roomTypeId, {
            minAvailable: inv.availableInventory,
            basePrice: rt ? rt.basePrice.toNumber() : 0,
            currency: hotel.currency,
          });
        } else {
          existing.minAvailable = Math.min(existing.minAvailable, inv.availableInventory);
        }
      }

      // Remove room types that have no coverage for all dates
      const result: AvailabilityResult[] = [];
      for (const [roomTypeId, info] of availByRoomType.entries()) {
        // Check every date has inventory
        const coveredDates = inventoryRecords
          .filter((i) => i.roomTypeId === roomTypeId)
          .map((i) => i.inventoryDate.toISOString().substring(0, 10));

        const allCovered = dateRange.every((d) =>
          coveredDates.includes(d.toISOString().substring(0, 10))
        );

        if (allCovered && info.minAvailable > 0) {
          result.push({
            roomTypeId,
            hotelId: dto.hotelId,
            checkInDate,
            checkOutDate,
            nightCount,
            availableRooms: info.minAvailable,
            basePrice: info.basePrice,
            currency: info.currency,
          });
        }
      }

      return result;
    });
  }
}
