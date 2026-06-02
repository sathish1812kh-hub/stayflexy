import type { Logger } from '@stayflexi/shared-logger'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { IBookingRepository } from '../domain/repositories/IBookingRepository'
import type { IInventoryRepository } from '../domain/repositories/IInventoryRepository'

export interface SagaStep {
  name: string
  execute(ctx: BookingSagaContext): Promise<void>
  compensate(ctx: BookingSagaContext): Promise<void>
}

export interface BookingSagaContext {
  bookingId: string
  hotelId: string
  organizationId: string
  roomTypeIds: string[]
  checkInDate: Date
  checkOutDate: Date
  correlationId?: string
  [key: string]: unknown
}

export class BookingCreationSaga {
  private readonly steps: SagaStep[]

  constructor(
    private readonly bookingRepo: IBookingRepository,
    private readonly inventoryRepo: IInventoryRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger
  ) {
    this.steps = [
      this.createReserveInventoryStep(),
      this.createPublishEventStep(),
    ]
  }

  async execute(ctx: BookingSagaContext): Promise<void> {
    const executed: SagaStep[] = []
    try {
      for (const step of this.steps) {
        this.logger.debug({ step: step.name, bookingId: ctx.bookingId }, 'Executing saga step')
        await step.execute(ctx)
        executed.push(step)
      }
    } catch (err) {
      this.logger.error({ err, bookingId: ctx.bookingId }, 'Saga step failed, compensating')
      for (const step of [...executed].reverse()) {
        await step.compensate(ctx).catch(compErr => {
          this.logger.error({ compErr, step: step.name }, 'Compensation failed')
        })
      }
      throw err
    }
  }

  private createReserveInventoryStep(): SagaStep {
    return {
      name: 'ReserveInventory',
      execute: async (ctx) => {
        for (const roomTypeId of ctx.roomTypeIds) {
          await this.inventoryRepo.reserveInventory(roomTypeId, ctx.organizationId, ctx.hotelId, ctx.checkInDate, ctx.checkOutDate)
        }
      },
      compensate: async (ctx) => {
        for (const roomTypeId of ctx.roomTypeIds) {
          await this.inventoryRepo.releaseInventory(roomTypeId, ctx.checkInDate, ctx.checkOutDate).catch(() => undefined)
        }
        await this.bookingRepo.updateStatus(ctx.bookingId, 'CANCELLED', {
          cancelledAt: new Date(), cancelledById: 'saga-compensator',
          cancellationReason: 'HOTEL_REQUEST', cancellationNote: 'Inventory reservation failed',
        }).catch(() => undefined)
      },
    }
  }

  private createPublishEventStep(): SagaStep {
    return {
      name: 'PublishCreatedEvent',
      execute: async (ctx) => {
        await this.eventPublisher.publish('booking.events', {
          eventType: 'booking.created',
          aggregateId: ctx.bookingId,
          aggregateType: 'Booking',
          organizationId: ctx.organizationId,
          correlationId: ctx.correlationId,
          payload: { bookingId: ctx.bookingId, hotelId: ctx.hotelId },
        })
      },
      compensate: async (_ctx) => {
        // Event publishing compensation: no-op (events are best-effort)
      },
    }
  }
}
