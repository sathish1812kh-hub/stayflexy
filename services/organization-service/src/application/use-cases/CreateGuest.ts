import type { IGuestRepository } from '../../domain/repositories/IGuestRepository'
import type { Guest } from '../../domain/entities/Guest'
import type { Logger } from '@stayflexi/shared-logger'
import { NotFoundError, ValidationError } from '@stayflexi/shared-errors'

export class CreateGuest {
  constructor(
    private readonly guestRepo: IGuestRepository,
    private readonly logger: Logger,
  ) {}

  async execute(data: {
    organizationId: string
    hotelId?: string | null
    firstName: string
    lastName: string
    email?: string | null
    phone?: string | null
    nationality?: string | null
    dateOfBirth?: Date | null
    governmentIdType?: Guest['governmentIdType']
    governmentIdNumber?: string | null
    preferences?: Record<string, unknown> | null
    loyaltyTier?: string | null
    loyaltyPoints?: number
    metadata?: Record<string, unknown> | null
  }): Promise<Guest> {
    if (!data.firstName || data.firstName.trim().length === 0) {
      throw new ValidationError('First name is required')
    }
    if (!data.lastName || data.lastName.trim().length === 0) {
      throw new ValidationError('Last name is required')
    }
    if (!data.organizationId) {
      throw new ValidationError('Organization ID is required')
    }

    const guest = await this.guestRepo.create(data)
    this.logger.info('Guest created', { guestId: guest.id, organizationId: data.organizationId })
    return guest
  }
}
