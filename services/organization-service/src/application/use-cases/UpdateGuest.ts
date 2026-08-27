import type { IGuestRepository } from '../../domain/repositories/IGuestRepository'
import type { Guest } from '../../domain/entities/Guest'
import type { Logger } from '@stayflexi/shared-logger'
import { NotFoundError, ValidationError, ConflictError } from '@stayflexi/shared-errors'

export class UpdateGuest {
  constructor(
    private readonly guestRepo: IGuestRepository,
    private readonly logger: Logger,
  ) {}

  async execute(
    id: string,
    data: Partial<{
      hotelId: string | null
      firstName: string
      lastName: string
      email: string | null
      phone: string | null
      nationality: string | null
      dateOfBirth: Date | null
      governmentIdType: Guest['governmentIdType']
      governmentIdNumber: string | null
      preferences: Record<string, unknown> | null
      loyaltyTier: string | null
      loyaltyPoints: number
      metadata: Record<string, unknown> | null
    }>,
    organizationId?: string | null,
  ): Promise<Guest> {
    if (data.firstName !== undefined && data.firstName.trim().length === 0) {
      throw new ValidationError('First name cannot be empty')
    }
    if (data.lastName !== undefined && data.lastName.trim().length === 0) {
      throw new ValidationError('Last name cannot be empty')
    }

    const guest = await this.guestRepo.update(id, data, organizationId)
    this.logger.info('Guest updated', { guestId: id })
    return guest
  }
}
