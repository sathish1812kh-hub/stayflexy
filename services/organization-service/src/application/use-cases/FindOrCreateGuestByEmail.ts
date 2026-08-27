import type { IGuestRepository } from '../../domain/repositories/IGuestRepository'
import type { Guest } from '../../domain/entities/Guest'
import type { Logger } from '@stayflexi/shared-logger'

export class FindOrCreateGuestByEmail {
  constructor(
    private readonly guestRepo: IGuestRepository,
    private readonly logger: Logger,
  ) {}

  async execute(data: {
    organizationId: string
    hotelId?: string | null
    email: string
    firstName: string
    lastName: string
    phone?: string | null
    nationality?: string | null
    dateOfBirth?: Date | null
    governmentIdType?: Guest['governmentIdType']
    governmentIdNumber?: string | null
  }): Promise<Guest> {
    return this.guestRepo.findOrCreateByEmail(data)
  }
}
