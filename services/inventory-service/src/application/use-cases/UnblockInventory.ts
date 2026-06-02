import { BadRequestError, NotFoundError } from '@stayflexi/shared-errors'
import { INVENTORY_EVENTS } from '@stayflexi/shared-events'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { IInventoryRepository } from '../../domain/repositories/IInventoryRepository'
import type { IInventoryBlockRepository } from '../../domain/repositories/IInventoryBlockRepository'
import type { DistributedLockService } from '../services/DistributedLockService'
import type { InventoryCache } from '../services/InventoryCache'
import type { UnblockInventoryDto } from '../dtos/inventory.dto'
import type { Logger } from '@stayflexi/shared-logger'

export interface UnblockResult {
  roomTypeId: string
  hotelId: string
  unblockedDates: string[]
  quantity: number
}

function parseUTCDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`)
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function generateDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = []
  const current = new Date(start)
  while (current <= end) {
    dates.push(new Date(current))
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return dates
}

export class UnblockInventory {
  constructor(
    private readonly inventoryRepo: IInventoryRepository,
    private readonly blockRepo: IInventoryBlockRepository,
    private readonly lockService: DistributedLockService,
    private readonly cache: InventoryCache,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger
  ) {}

  async execute(
    dto: UnblockInventoryDto,
    requestingOrgId: string,
    correlationId?: string
  ): Promise<UnblockResult> {
    const startDate = parseUTCDate(dto.startDate)
    const endDate = parseUTCDate(dto.endDate)

    if (endDate < startDate) {
      throw new BadRequestError('endDate must be on or after startDate')
    }

    const dates = generateDateRange(startDate, endDate)
    const lockNames = dates
      .map((d) => DistributedLockService.inventoryKey(dto.roomTypeId, formatDate(d)))
      .sort()

    const unblockedDates = await this.lockService.withMultipleLocks(lockNames, async () => {
      const unblocked: string[] = []

      for (const date of dates) {
        const inv = await this.inventoryRepo.findByRoomTypeAndDate(dto.roomTypeId, date)
        if (!inv) {
          throw new NotFoundError(
            `No inventory record found for roomTypeId=${dto.roomTypeId} date=${formatDate(date)}`
          )
        }

        if (inv.blockedCount < dto.quantity) {
          throw new BadRequestError(
            `Cannot unblock ${dto.quantity}: only ${inv.blockedCount} blocked on ${formatDate(date)}`
          )
        }

        await this.inventoryRepo.decrementBlocked(inv.id, dto.quantity)
        await this.blockRepo.deactivateOldestByInventory(inv.id, dto.quantity)
        await this.cache.invalidate(dto.roomTypeId, date)
        unblocked.push(formatDate(date))
      }

      return unblocked
    })

    this.eventPublisher
      .publish('inventory.events', {
        eventType: INVENTORY_EVENTS.INVENTORY_UNBLOCKED,
        aggregateId: dto.roomTypeId,
        aggregateType: 'Inventory',
        organizationId: requestingOrgId,
        correlationId,
        payload: {
          roomTypeId: dto.roomTypeId,
          hotelId: dto.hotelId,
          unblockedDates,
          quantity: dto.quantity,
        },
      })
      .catch((err: unknown) => {
        this.logger.warn({ err }, 'Failed to publish inventory.unblocked event')
      })

    this.logger.info(
      { roomTypeId: dto.roomTypeId, dates: unblockedDates.length, correlationId },
      'Inventory unblocked'
    )

    return {
      roomTypeId: dto.roomTypeId,
      hotelId: dto.hotelId,
      unblockedDates,
      quantity: dto.quantity,
    }
  }
}
