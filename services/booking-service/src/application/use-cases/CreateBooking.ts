import { BadRequestError, ConflictError } from '@stayflexi/shared-errors'
import type { IBookingRepository, FullBooking } from '../../domain/repositories/IBookingRepository'
import type { IInventoryRepository } from '../../domain/repositories/IInventoryRepository'
import type { RedisDistributedLock } from '../../infrastructure/locking/RedisDistributedLock'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'
import { DateRange } from '../../domain/value-objects/DateRange'
import { BookingNumber } from '../../domain/value-objects/BookingNumber'
import type { CreateBookingDto } from '../dtos/booking.dto'
import { getPrismaClient } from '@stayflexi/shared-database'

export interface CreateBookingContext {
  organizationId: string
  userId: string
  correlationId?: string
  maxAdvanceBookingDays: number
  maxRoomsPerBooking: number
}

export class CreateBooking {
  constructor(
    private readonly bookingRepo: IBookingRepository,
    private readonly inventoryRepo: IInventoryRepository,
    private readonly lock: RedisDistributedLock,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger
  ) {}

  async execute(dto: CreateBookingDto, ctx: CreateBookingContext): Promise<FullBooking> {
    // Validate date range
    let dateRange: DateRange
    try { dateRange = DateRange.create(dto.checkInDate, dto.checkOutDate) }
    catch (err) { throw new BadRequestError(err instanceof Error ? err.message : 'Invalid dates') }

    if (!dateRange.isValidAdvanceBooking(ctx.maxAdvanceBookingDays)) {
      throw new BadRequestError(`Bookings can only be made up to ${ctx.maxAdvanceBookingDays} days in advance`)
    }
    if (dto.rooms.length > ctx.maxRoomsPerBooking) {
      throw new BadRequestError(`Maximum ${ctx.maxRoomsPerBooking} rooms per booking`)
    }

    // No duplicate rooms
    const roomIds = dto.rooms.map(r => r.roomId)
    if (new Set(roomIds).size !== roomIds.length) throw new BadRequestError('Duplicate rooms in request')

    // Acquire distributed locks per room (sorted to prevent deadlock)
    const sortedRoomIds = [...roomIds].sort()
    const acquiredLocks: Array<{ resource: string; token: string }> = []

    try {
      for (const roomId of sortedRoomIds) {
        const resource = `booking:room:${roomId}`
        const token = await this.lock.acquire(resource, { ttlMs: 30000 })
        if (!token) throw new ConflictError('Room is being booked concurrently. Please retry.', 'LOCK_CONFLICT')
        acquiredLocks.push({ resource, token })
      }
      return await this.executeWithLocks(dto, dateRange, ctx)
    } finally {
      for (const { resource, token } of acquiredLocks.reverse()) {
        await this.lock.release(resource, token).catch(() => undefined)
      }
    }
  }

  private async executeWithLocks(dto: CreateBookingDto, dateRange: DateRange, ctx: CreateBookingContext): Promise<FullBooking> {
    // Check for overlapping bookings (overbooking prevention)
    for (const room of dto.rooms) {
      const overlapping = await this.bookingRepo.findOverlappingRoomBookings(room.roomId, dateRange.checkIn, dateRange.checkOut)
      if (overlapping.length > 0) throw new ConflictError('Room is not available for the requested dates', 'ROOM_UNAVAILABLE')
    }

    // Check inventory availability
    for (const room of dto.rooms) {
      const available = await this.inventoryRepo.checkAvailability(room.roomTypeId, dateRange.checkIn, dateRange.checkOut)
      if (!available) throw new ConflictError('Insufficient inventory for requested room type and dates', 'INVENTORY_UNAVAILABLE')
    }

    // Fetch room rates from DB
    const roomRates = await this.getRoomRates(dto.rooms.map(r => r.roomTypeId))

    // Compute amounts
    let totalAmount = 0
    const roomsData = dto.rooms.map(room => {
      const rate = roomRates.get(room.roomTypeId) ?? 0
      const roomTotal = rate * dateRange.nightCount
      totalAmount += roomTotal
      return {
        roomId: room.roomId, roomTypeId: room.roomTypeId, hotelId: dto.hotelId,
        checkInDate: dateRange.checkIn, checkOutDate: dateRange.checkOut,
        nightCount: dateRange.nightCount, adultCount: room.adultCount, childCount: room.childCount,
        roomRate: rate, totalRoomAmount: roomTotal,
      }
    })

    const taxAmount = totalAmount * 0.10
    const finalAmount = totalAmount + taxAmount
    const bookingNumber = BookingNumber.generate().toString()

    const guestsData = dto.guests.map((g, i) => ({
      isPrimary: i === 0,
      firstName: g.firstName, lastName: g.lastName,
      email: g.email ?? null, phone: g.phone ?? null,
      nationality: g.nationality ?? null,
      governmentIdType: g.governmentIdType ?? null,
      governmentIdNumber: g.governmentIdNumber ?? null,
      dateOfBirth: g.dateOfBirth ?? null,
    }))

    const result = await this.bookingRepo.createWithDetails(
      {
        organizationId: ctx.organizationId, hotelId: dto.hotelId, bookingNumber,
        status: 'CONFIRMED', source: dto.source,
        totalAmount, taxAmount, discountAmount: 0, finalAmount,
        currency: dto.currency, specialRequests: dto.specialRequests ?? null, bookedById: ctx.userId,
      },
      roomsData, guestsData
    )

    // Reserve inventory (fire-and-forget — compensate later if fails)
    for (const room of dto.rooms) {
      this.inventoryRepo.reserveInventory(room.roomTypeId, ctx.organizationId, dto.hotelId, dateRange.checkIn, dateRange.checkOut)
        .catch(err => this.logger.error({ err, roomTypeId: room.roomTypeId }, 'Inventory reservation failed post-booking'))
    }

    // Publish event
    this.eventPublisher.publish('booking.events', {
      eventType: 'booking.created',
      aggregateId: result.booking.id,
      aggregateType: 'Booking',
      organizationId: ctx.organizationId,
      correlationId: ctx.correlationId,
      payload: {
        bookingId: result.booking.id, bookingNumber, hotelId: dto.hotelId,
        roomIds: dto.rooms.map(r => r.roomId),
        primaryGuestName: guestsData[0] ? `${guestsData[0].firstName} ${guestsData[0].lastName}` : '',
        checkIn: dto.checkInDate, checkOut: dto.checkOutDate,
        nightCount: dateRange.nightCount, totalAmount, currency: dto.currency, source: dto.source, bookedById: ctx.userId,
      },
    }).catch(err => this.logger.warn({ err }, 'Failed to publish booking.created event'))

    this.logger.info({ bookingId: result.booking.id, bookingNumber, correlationId: ctx.correlationId }, 'Booking created')
    return result
  }

  private async getRoomRates(roomTypeIds: string[]): Promise<Map<string, number>> {
    const db = getPrismaClient()
    const types = await db.roomType.findMany({ where: { id: { in: roomTypeIds } }, select: { id: true, basePrice: true } })
    const map = new Map<string, number>()
    for (const t of types) map.set(t.id, t.basePrice.toNumber())
    return map
  }
}
