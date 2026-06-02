import { NotFoundError, ConflictError, ForbiddenError } from '@stayflexi/shared-errors'
import type { IOtaReservationRepository } from '../../domain/repositories/IOtaReservationRepository'
import type { OtaReservation } from '../../domain/entities/OtaReservation'
import type { OtaEventPublisher } from '../../infrastructure/events/OtaEventPublisher'
import type { Logger } from '@stayflexi/shared-logger'

export interface ImportReservationContext {
  organizationId: string
  userId: string
  correlationId?: string
}

export class ImportReservation {
  constructor(
    private readonly reservationRepo: IOtaReservationRepository,
    private readonly eventPublisher: OtaEventPublisher,
    private readonly logger: Logger,
  ) {}

  async execute(
    reservationId: string,
    bookingId: string | undefined,
    ctx: ImportReservationContext,
  ): Promise<OtaReservation> {
    const reservation = await this.reservationRepo.findById(reservationId)
    if (!reservation) {
      throw new NotFoundError(`OTA reservation not found: ${reservationId}`)
    }

    if (!reservation.belongsToOrganization(ctx.organizationId)) {
      throw new ForbiddenError('OTA reservation does not belong to your organization')
    }

    if (reservation.isImported()) {
      throw new ConflictError(
        `OTA reservation ${reservationId} has already been imported (bookingId: ${reservation.bookingId ?? 'none'})`,
      )
    }

    if (reservation.isDuplicate()) {
      throw new ConflictError(`OTA reservation ${reservationId} is marked as duplicate`)
    }

    const updated = await this.reservationRepo.updateStatus(reservationId, 'IMPORTED', {
      bookingId,
      importedAt: new Date(),
    })

    this.logger.info(
      {
        reservationId,
        externalReservationId: reservation.externalReservationId,
        hotelId: reservation.hotelId,
        providerId: reservation.providerId,
        bookingId,
        organizationId: ctx.organizationId,
        correlationId: ctx.correlationId,
      },
      'OTA reservation imported',
    )

    this.eventPublisher.publishReservationImported({
      otaReservationId: reservationId,
      organizationId: ctx.organizationId,
      hotelId: reservation.hotelId,
      providerId: reservation.providerId,
      externalReservationId: reservation.externalReservationId,
      correlationId: ctx.correlationId,
    })

    return updated
  }
}
