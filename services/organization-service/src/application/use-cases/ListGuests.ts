import type { IGuestRepository } from '../../domain/repositories/IGuestRepository'
import type { Guest } from '../../domain/entities/Guest'
import type { Logger } from '@stayflexi/shared-logger'

export class ListGuests {
  constructor(
    private readonly guestRepo: IGuestRepository,
    private readonly logger: Logger,
  ) {}

  async execute(
    organizationId: string,
    options?: {
      hotelId?: string | null
      search?: string
      loyaltyTier?: string
      page?: number
      limit?: number
    },
  ): Promise<{ data: Guest[]; meta: { total: number; page: number; limit: number } }> {
    return this.guestRepo.list(organizationId, options)
  }
}
