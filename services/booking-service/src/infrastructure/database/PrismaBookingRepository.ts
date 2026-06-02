import { getPrismaClient, Prisma } from '@stayflexi/shared-database'
import { buildPaginationMeta } from '@stayflexi/shared-types'
import { fromPrismaError } from '@stayflexi/shared-errors'
import type { PrismaClient } from '@prisma/client'
import { Booking } from '../../domain/entities/Booking'
import { BookingRoom } from '../../domain/entities/BookingRoom'
import { BookingGuest } from '../../domain/entities/BookingGuest'
import type {
  BookingStatus, BookingSource, CancellationReason, BookingProps,
} from '../../domain/entities/Booking'
import type { BookingRoomStatus, BookingRoomProps } from '../../domain/entities/BookingRoom'
import type { GovIdType, BookingGuestProps } from '../../domain/entities/BookingGuest'
import type {
  IBookingRepository, CreateBookingData, CreateBookingRoomData,
  CreateBookingGuestData, BookingSearchParams, FullBooking,
} from '../../domain/repositories/IBookingRepository'
import type { PaginatedResult } from '@stayflexi/shared-types'

type PrismaBooking = Prisma.BookingGetPayload<Record<string, never>>
type PrismaBookingRoom = Prisma.BookingRoomGetPayload<Record<string, never>>
type PrismaBookingGuest = Prisma.BookingGuestGetPayload<Record<string, never>>

function mapToBooking(r: PrismaBooking): Booking {
  return new Booking({
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    bookingNumber: r.bookingNumber,
    status: r.status as BookingStatus,
    source: r.source as BookingSource,
    primaryGuestId: r.primaryGuestId,
    amounts: {
      totalAmount: r.totalAmount.toNumber(),
      taxAmount: r.taxAmount.toNumber(),
      discountAmount: r.discountAmount.toNumber(),
      finalAmount: r.finalAmount.toNumber(),
      currency: r.currency,
    },
    specialRequests: r.specialRequests,
    internalNotes: r.internalNotes,
    bookedById: r.bookedById,
    checkedInAt: r.checkedInAt,
    checkedInById: r.checkedInById,
    checkedOutAt: r.checkedOutAt,
    checkedOutById: r.checkedOutById,
    cancelledAt: r.cancelledAt,
    cancelledById: r.cancelledById,
    cancellationReason: r.cancellationReason as CancellationReason | null,
    cancellationNote: r.cancellationNote,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    deletedAt: r.deletedAt,
  })
}

function mapToRoom(r: PrismaBookingRoom): BookingRoom {
  return new BookingRoom({
    id: r.id, bookingId: r.bookingId, roomId: r.roomId, roomTypeId: r.roomTypeId, hotelId: r.hotelId,
    checkInDate: r.checkInDate, checkOutDate: r.checkOutDate, nightCount: r.nightCount,
    adultCount: r.adultCount, childCount: r.childCount,
    roomRate: r.roomRate.toNumber(), totalRoomAmount: r.totalRoomAmount.toNumber(),
    status: r.status as BookingRoomStatus,
  })
}

function mapToGuest(r: PrismaBookingGuest): BookingGuest {
  return new BookingGuest({
    id: r.id, bookingId: r.bookingId, isPrimary: r.isPrimary,
    firstName: r.firstName, lastName: r.lastName, email: r.email, phone: r.phone,
    nationality: r.nationality, governmentIdType: r.governmentIdType as GovIdType | null,
    governmentIdNumber: r.governmentIdNumber, dateOfBirth: r.dateOfBirth,
  })
}

export class PrismaBookingRepository implements IBookingRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findById(id: string): Promise<Booking | null> {
    try {
      const r = await this.db.booking.findFirst({ where: { id, deletedAt: null } })
      return r ? mapToBooking(r) : null
    } catch (err) { const e = fromPrismaError(err); if (e) throw e; throw err }
  }

  async findByIdWithDetails(id: string): Promise<FullBooking | null> {
    try {
      const r = await this.db.booking.findFirst({
        where: { id, deletedAt: null },
        include: { rooms: true, guests: true },
      })
      if (!r) return null
      return { booking: mapToBooking(r), rooms: r.rooms.map(mapToRoom), guests: r.guests.map(mapToGuest) }
    } catch (err) { const e = fromPrismaError(err); if (e) throw e; throw err }
  }

  async findByBookingNumber(bookingNumber: string): Promise<Booking | null> {
    const r = await this.db.booking.findUnique({ where: { bookingNumber } })
    return r ? mapToBooking(r) : null
  }

  async findOverlappingRoomBookings(
    roomId: string, checkInDate: Date, checkOutDate: Date, excludeBookingId?: string
  ): Promise<BookingRoom[]> {
    const records = await this.db.bookingRoom.findMany({
      where: {
        roomId,
        status: { notIn: ['CANCELLED', 'VACATED'] },
        checkInDate: { lt: checkOutDate },
        checkOutDate: { gt: checkInDate },
        booking: {
          ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
          status: { notIn: ['CANCELLED', 'CHECKED_OUT'] },
          deletedAt: null,
        },
      },
    })
    return records.map(mapToRoom)
  }

  async createWithDetails(
    bookingData: CreateBookingData,
    roomsData: Array<Omit<CreateBookingRoomData, 'bookingId'>>,
    guestsData: Array<Omit<CreateBookingGuestData, 'bookingId'>>
  ): Promise<FullBooking> {
    try {
      return await this.db.$transaction(async (tx) => {
        const booking = await tx.booking.create({
          data: {
            organizationId: bookingData.organizationId,
            hotelId: bookingData.hotelId,
            bookingNumber: bookingData.bookingNumber,
            status: bookingData.status as PrismaBooking['status'],
            source: bookingData.source as PrismaBooking['source'],
            totalAmount: new Prisma.Decimal(bookingData.totalAmount),
            taxAmount: new Prisma.Decimal(bookingData.taxAmount),
            discountAmount: new Prisma.Decimal(bookingData.discountAmount),
            finalAmount: new Prisma.Decimal(bookingData.finalAmount),
            currency: bookingData.currency,
            specialRequests: bookingData.specialRequests ?? null,
            internalNotes: bookingData.internalNotes ?? null,
            bookedById: bookingData.bookedById,
          },
        })

        const rooms = await Promise.all(roomsData.map(room =>
          tx.bookingRoom.create({
            data: {
              bookingId: booking.id, roomId: room.roomId, roomTypeId: room.roomTypeId,
              hotelId: room.hotelId, checkInDate: room.checkInDate, checkOutDate: room.checkOutDate,
              nightCount: room.nightCount, adultCount: room.adultCount, childCount: room.childCount,
              roomRate: new Prisma.Decimal(room.roomRate),
              totalRoomAmount: new Prisma.Decimal(room.totalRoomAmount),
              status: 'RESERVED',
            },
          })
        ))

        const guests = await Promise.all(guestsData.map(g =>
          tx.bookingGuest.create({
            data: {
              bookingId: booking.id, isPrimary: g.isPrimary ?? false,
              firstName: g.firstName ?? '', lastName: g.lastName ?? '',
              email: g.email ?? null, phone: g.phone ?? null,
              nationality: g.nationality ?? null,
              governmentIdType: (g.governmentIdType ?? null) as PrismaBookingGuest['governmentIdType'],
              governmentIdNumber: g.governmentIdNumber ?? null,
              dateOfBirth: g.dateOfBirth ?? null,
            },
          })
        ))

        const primaryGuest = guests[0]
        if (primaryGuest) {
          await tx.booking.update({ where: { id: booking.id }, data: { primaryGuestId: primaryGuest.id } })
        }

        await tx.bookingAudit.create({
          data: {
            bookingId: booking.id, eventType: 'CREATED',
            eventDescription: 'Booking created', performedById: bookingData.bookedById,
          },
        })

        return {
          booking: mapToBooking({ ...booking, primaryGuestId: primaryGuest?.id ?? null }),
          rooms: rooms.map(mapToRoom),
          guests: guests.map(mapToGuest),
        }
      })
    } catch (err) { const e = fromPrismaError(err); if (e) throw e; throw err }
  }

  async findByOrganization(params: BookingSearchParams): Promise<PaginatedResult<FullBooking>> {
    const skip = (params.page - 1) * params.limit
    const where: Prisma.BookingWhereInput = {
      organizationId: params.organizationId,
      deletedAt: null,
      ...(params.hotelId && { hotelId: params.hotelId }),
      ...(params.status && { status: params.status as PrismaBooking['status'] }),
      ...(params.source && { source: params.source as PrismaBooking['source'] }),
      ...(params.bookingNumber && { bookingNumber: { contains: params.bookingNumber } }),
      ...((params.startDate || params.endDate) && {
        createdAt: {
          ...(params.startDate && { gte: params.startDate }),
          ...(params.endDate && { lte: params.endDate }),
        },
      }),
      ...((params.guestEmail || params.guestName) && {
        guests: {
          some: {
            ...(params.guestEmail && { email: { contains: params.guestEmail, mode: 'insensitive' as const } }),
            ...(params.guestName && {
              OR: [
                { firstName: { contains: params.guestName, mode: 'insensitive' as const } },
                { lastName: { contains: params.guestName, mode: 'insensitive' as const } },
              ],
            }),
          },
        },
      }),
    }
    const [records, total] = await Promise.all([
      this.db.booking.findMany({ where, include: { rooms: true, guests: true }, skip, take: params.limit, orderBy: { createdAt: 'desc' } }),
      this.db.booking.count({ where }),
    ])
    return {
      data: records.map(r => ({ booking: mapToBooking(r), rooms: r.rooms.map(mapToRoom), guests: r.guests.map(mapToGuest) })),
      meta: buildPaginationMeta(total, params.page, params.limit),
    }
  }

  async updateStatus(id: string, status: BookingStatus, extra?: {
    checkedInAt?: Date; checkedInById?: string
    checkedOutAt?: Date; checkedOutById?: string
    cancelledAt?: Date; cancelledById?: string
    cancellationReason?: string; cancellationNote?: string
    primaryGuestId?: string
  }): Promise<Booking> {
    const r = await this.db.booking.update({
      where: { id },
      data: {
        status: status as PrismaBooking['status'],
        ...(extra?.checkedInAt && { checkedInAt: extra.checkedInAt }),
        ...(extra?.checkedInById && { checkedInById: extra.checkedInById }),
        ...(extra?.checkedOutAt && { checkedOutAt: extra.checkedOutAt }),
        ...(extra?.checkedOutById && { checkedOutById: extra.checkedOutById }),
        ...(extra?.cancelledAt && { cancelledAt: extra.cancelledAt }),
        ...(extra?.cancelledById && { cancelledById: extra.cancelledById }),
        ...(extra?.cancellationReason && { cancellationReason: extra.cancellationReason as PrismaBooking['cancellationReason'] }),
        ...(extra?.cancellationNote !== undefined && { cancellationNote: extra.cancellationNote }),
        ...(extra?.primaryGuestId && { primaryGuestId: extra.primaryGuestId }),
      },
    })
    return mapToBooking(r)
  }

  async updateRoomStatuses(bookingId: string, status: string): Promise<void> {
    await this.db.bookingRoom.updateMany({
      where: { bookingId },
      data: { status: status as PrismaBookingRoom['status'] },
    })
  }

  async addAuditEntry(bookingId: string, eventType: string, description: string, performedById: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.db.bookingAudit.create({
      data: {
        bookingId,
        eventType: eventType as PrismaBooking['status'],
        eventDescription: description,
        performedById,
        ...(metadata && { metadata: metadata as Prisma.InputJsonValue }),
      },
    })
  }
}
