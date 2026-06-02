import { BadRequestError, ConflictError } from '@stayflexi/shared-errors'
import { INVENTORY_EVENTS } from '@stayflexi/shared-events'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { IInventoryRepository } from '../../domain/repositories/IInventoryRepository'
import type { IInventoryBlockRepository } from '../../domain/repositories/IInventoryBlockRepository'
import type { DistributedLockService } from '../services/DistributedLockService'
import type { InventoryCache } from '../services/InventoryCache'
import type { BlockInventoryDto } from '../dtos/inventory.dto'
import type { Logger } from '@stayflexi/shared-logger'

export interface BlockResult {
  roomTypeId: string
  hotelId: string
  blockedDates: string[]
  reason: string
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

export class BlockInventory {
  constructor(
    private readonly inventoryRepo: IInventoryRepository,
    private readonly blockRepo: IInventoryBlockRepository,
    private readonly lockService: DistributedLockService,
    private readonly cache: InventoryCache,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger
  ) {}

  async execute(
    dto: BlockInventoryDto,
    requestingOrgId: string,
    requestingUserId: string,
    correlationId?: string
  ): Promise<BlockResult> {
    const startDate = parseUTCDate(dto.startDate)
    const endDate = parseUTCDate(dto.endDate)

    if (endDate < startDate) {
      throw new BadRequestError('endDate must be on or after startDate')
    }

    const dates = generateDateRange(startDate, endDate)
    const lockNames = dates
      .map((d) => DistributedLockService.inventoryKey(dto.roomTypeId, formatDate(d)))
      .sort()

    const blockedDates = await this.lockService.withMultipleLocks(lockNames, async () => {
      const blocked: string[] = []

      for (const date of dates) {
        const inv = await this.inventoryRepo.findOrCreate({
          roomTypeId: dto.roomTypeId,
          hotelId: dto.hotelId,
          organizationId: requestingOrgId,
          date,
          totalRoomsHint: dto.totalRoomsHint ?? 0,
        })

        if (!inv.canBlock(dto.quantity)) {
          throw new ConflictError(
            `Cannot block ${dto.quantity} room(s) for ${formatDate(date)}: available=${inv.availableCount}`,
            'INSUFFICIENT_AVAILABLE_TO_BLOCK'
          )
        }

        await this.inventoryRepo.incrementBlocked(inv.id, dto.quantity)

        await this.blockRepo.create({
          inventoryId: inv.id,
          hotelId: dto.hotelId,
          organizationId: requestingOrgId,
          reason: dto.reason,
          blockedById: requestingUserId,
          quantity: dto.quantity,
          notes: dto.notes,
          correlationId,
        })

        await this.cache.invalidate(dto.roomTypeId, date)
        blocked.push(formatDate(date))
      }

      return blocked
    })

    this.eventPublisher
      .publish('inventory.events', {
        eventType: INVENTORY_EVENTS.INVENTORY_BLOCKED,
        aggregateId: dto.roomTypeId,
        aggregateType: 'Inventory',
        organizationId: requestingOrgId,
        correlationId,
        payload: {
          roomTypeId: dto.roomTypeId,
          hotelId: dto.hotelId,
          blockedDates,
          reason: dto.reason,
          quantity: dto.quantity,
          blockedById: requestingUserId,
        },
      })
      .catch((err: unknown) => {
        this.logger.warn({ err }, 'Failed to publish inventory.blocked event')
      })

    this.logger.info(
      { roomTypeId: dto.roomTypeId, hotelId: dto.hotelId, dates: blockedDates.length, correlationId },
      'Inventory blocked'
    )

    return {
      roomTypeId: dto.roomTypeId,
      hotelId: dto.hotelId,
      blockedDates,
      reason: dto.reason,
      quantity: dto.quantity,
    }
  }
}
