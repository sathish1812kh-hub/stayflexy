import { BadRequestError, ForbiddenError, ConflictError } from '@stayflexi/shared-errors'
import { INVENTORY_EVENTS } from '@stayflexi/shared-events'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { IInventoryRepository } from '../../domain/repositories/IInventoryRepository'
import type { DistributedLockService } from '../services/DistributedLockService'
import type { InventoryCache } from '../services/InventoryCache'
import type { ReserveInventoryDto } from '../dtos/inventory.dto'
import type { Logger } from '@stayflexi/shared-logger'

export interface ReserveResult {
  bookingRef: string
  hotelId: string
  roomTypeId: string
  checkInDate: string
  checkOutDate: string
  nights: number
  quantity: number
  reservationIds: string[]
}

function parseUTCDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`)
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Returns dates from checkIn (inclusive) to checkOut (exclusive) — the nights */
function generateNightDates(checkIn: Date, checkOut: Date): Date[] {
  const dates: Date[] = []
  const current = new Date(checkIn)
  while (current < checkOut) {
    dates.push(new Date(current))
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return dates
}

export class ReserveInventory {
  constructor(
    private readonly inventoryRepo: IInventoryRepository,
    private readonly lockService: DistributedLockService,
    private readonly cache: InventoryCache,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger
  ) {}

  async execute(
    dto: ReserveInventoryDto,
    requestingOrgId: string,
    correlationId?: string
  ): Promise<ReserveResult> {
    const checkIn = parseUTCDate(dto.checkInDate)
    const checkOut = parseUTCDate(dto.checkOutDate)

    if (checkOut <= checkIn) {
      throw new BadRequestError('checkOutDate must be after checkInDate')
    }

    const dates = generateNightDates(checkIn, checkOut)

    if (dates.length === 0) {
      throw new BadRequestError('Invalid date range: no nights computed')
    }

    // Build sorted lock names to prevent deadlocks across concurrent callers
    const lockNames = dates
      .map((d) => DistributedLockService.inventoryKey(dto.roomTypeId, formatDate(d)))
      .sort()

    const reservationIds = await this.lockService.withMultipleLocks(lockNames, async () => {
      // Pre-validate availability for all dates before any mutation
      for (const date of dates) {
        const inv = await this.inventoryRepo.findOrCreate({
          roomTypeId: dto.roomTypeId,
          hotelId: dto.hotelId,
          organizationId: requestingOrgId,
          date,
          totalRoomsHint: dto.totalRoomsHint ?? 0,
        })

        if (!inv.belongsTo(requestingOrgId)) {
          throw new ForbiddenError('Access denied to this inventory', 'INVENTORY_ACCESS_DENIED')
        }

        if (!inv.canReserve(dto.quantity)) {
          throw new ConflictError(
            `Overbooking prevented for ${formatDate(date)}: available=${inv.availableCount}, requested=${dto.quantity}`,
            'OVERBOOKING_PREVENTED'
          )
        }
      }

      // All dates are available — atomically reserve
      const ids = await this.inventoryRepo.reserveDateRange({
        dates,
        roomTypeId: dto.roomTypeId,
        hotelId: dto.hotelId,
        organizationId: requestingOrgId,
        bookingRef: dto.bookingRef,
        quantity: dto.quantity,
        totalRoomsHint: dto.totalRoomsHint ?? 0,
        correlationId,
      })

      // Invalidate cache for all affected dates
      for (const date of dates) {
        await this.cache.invalidate(dto.roomTypeId, date)
      }

      return ids
    })

    this.eventPublisher
      .publish('inventory.events', {
        eventType: INVENTORY_EVENTS.INVENTORY_RESERVED,
        aggregateId: dto.bookingRef,
        aggregateType: 'InventoryReservation',
        organizationId: requestingOrgId,
        correlationId,
        payload: {
          bookingRef: dto.bookingRef,
          hotelId: dto.hotelId,
          roomTypeId: dto.roomTypeId,
          checkInDate: dto.checkInDate,
          checkOutDate: dto.checkOutDate,
          quantity: dto.quantity,
          nights: dates.length,
        },
      })
      .catch((err: unknown) => {
        this.logger.warn({ err }, 'Failed to publish inventory.reserved event')
      })

    this.logger.info(
      {
        bookingRef: dto.bookingRef,
        hotelId: dto.hotelId,
        roomTypeId: dto.roomTypeId,
        nights: dates.length,
        quantity: dto.quantity,
        correlationId,
      },
      'Inventory reserved'
    )

    return {
      bookingRef: dto.bookingRef,
      hotelId: dto.hotelId,
      roomTypeId: dto.roomTypeId,
      checkInDate: dto.checkInDate,
      checkOutDate: dto.checkOutDate,
      nights: dates.length,
      quantity: dto.quantity,
      reservationIds,
    }
  }
}
