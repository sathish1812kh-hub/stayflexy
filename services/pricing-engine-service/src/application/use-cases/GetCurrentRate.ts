import { NotFoundError, ForbiddenError } from '@stayflexi/shared-errors'
import type { IDynamicRateRepository } from '../../domain/repositories/IDynamicRateRepository'
import type { PricingCache } from '../../infrastructure/cache/PricingCache'
import type { DynamicRate } from '../../domain/entities/DynamicRate'

export class GetCurrentRate {
  constructor(
    private readonly rateRepo: IDynamicRateRepository,
    private readonly cache: PricingCache,
  ) {}

  async execute(roomTypeId: string, targetDate: Date, organizationId: string): Promise<DynamicRate> {
    const dateStr = targetDate.toISOString().split('T')[0] as string

    // Try cache hit (returns a number, not a full entity)
    const cachedRate = await this.cache.getRate(roomTypeId, dateStr)

    const rate = await this.rateRepo.findByRoomTypeAndDate(roomTypeId, targetDate)
    if (!rate) {
      throw new NotFoundError(`No dynamic rate found for roomType ${roomTypeId} on ${dateStr}`)
    }
    if (!rate.belongsToOrganization(organizationId)) {
      throw new ForbiddenError('Access denied')
    }

    // If cache was stale, re-populate it
    if (cachedRate === null) {
      await this.cache.setRate(roomTypeId, dateStr, rate.calculatedRate)
    }

    return rate
  }

  async executeRange(
    hotelId: string,
    from: Date,
    to: Date,
    organizationId: string,
  ): Promise<DynamicRate[]> {
    const rates = await this.rateRepo.findByHotelAndDateRange(hotelId, from, to)
    return rates.filter(r => r.belongsToOrganization(organizationId))
  }
}
