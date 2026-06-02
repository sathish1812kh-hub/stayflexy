import { BadRequestError } from '@stayflexi/shared-errors'
import { INVENTORY_EVENTS } from '@stayflexi/shared-events'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { IInventoryReservationRepository } from '../../domain/repositories/IInventoryReservationRepository'
import type { ReleaseInventoryDto } from '../dtos/inventory.dto'
import type { Logger } from '@stayflexi/shared-logger'

export interface ReleaseResult {
  bookingRef: string
  hotelId: string
  releasedCount: number
}

export class ReleaseInventory {
  constructor(
    private readonly reservationRepo: IInventoryReservationRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger
  ) {}

  async execute(
    dto: ReleaseInventoryDto,
    requestingOrgId: string,
    correlationId?: string
  ): Promise<ReleaseResult> {
    const activeCount = await this.reservationRepo.countActiveByBookingRef(dto.bookingRef)

    if (activeCount === 0) {
      throw new BadRequestError(
        `No active reservations found for bookingRef '${dto.bookingRef}'`,
        ['RESERVATION_NOT_FOUND']
      )
    }

    const releasedCount = await this.reservationRepo.releaseByBookingRef(
      dto.bookingRef,
      requestingOrgId
    )

    this.eventPublisher
      .publish('inventory.events', {
        eventType: INVENTORY_EVENTS.INVENTORY_RELEASED,
        aggregateId: dto.bookingRef,
        aggregateType: 'InventoryReservation',
        organizationId: requestingOrgId,
        correlationId,
        payload: {
          bookingRef: dto.bookingRef,
          hotelId: dto.hotelId,
          releasedCount,
        },
      })
      .catch((err: unknown) => {
        this.logger.warn({ err }, 'Failed to publish inventory.released event')
      })

    this.logger.info(
      { bookingRef: dto.bookingRef, releasedCount, correlationId },
      'Inventory released'
    )

    return {
      bookingRef: dto.bookingRef,
      hotelId: dto.hotelId,
      releasedCount,
    }
  }
}
