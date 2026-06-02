import type { IPricingRuleRepository } from '../../domain/repositories/IPricingRuleRepository'
import type { IDynamicRateRepository } from '../../domain/repositories/IDynamicRateRepository'
import type { PricingCache } from '../../infrastructure/cache/PricingCache'
import type { SurgePricingController } from '../../engine/SurgePricingController'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'
import type { DynamicRate } from '../../domain/entities/DynamicRate'
import { PricingCalculator } from '../../engine/PricingCalculator'
import { PRICING_EVENTS } from '../../events/pricingEvents'

export interface ComputeRateInput {
  organizationId: string
  hotelId: string
  roomTypeId: string
  targetDate: Date
  baseRate: number
  currentOccupancy: number   // 0.0–1.0
  demandFactor?: number
  skipCache?: boolean
}

export class ComputeDynamicRate {
  private readonly calculator = new PricingCalculator()

  constructor(
    private readonly ruleRepo: IPricingRuleRepository,
    private readonly rateRepo: IDynamicRateRepository,
    private readonly cache: PricingCache,
    private readonly surge: SurgePricingController,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger,
    private readonly maxSurgeMultiplier: number = 3.0,
  ) {}

  async execute(input: ComputeRateInput): Promise<DynamicRate> {
    const dateStr = input.targetDate.toISOString().split('T')[0] as string

    // Check cache
    if (!input.skipCache) {
      const cached = await this.cache.getRate(input.roomTypeId, dateStr)
      if (cached !== null) {
        const existing = await this.rateRepo.findByRoomTypeAndDate(input.roomTypeId, input.targetDate)
        if (existing) return existing
      }
    }

    // Load active pricing rules for this hotel
    const activeRules = await this.ruleRepo.findActiveByHotel(input.hotelId, input.targetDate)

    // Check for active surge pricing
    const surge = await this.surge.getActiveSurge(input.hotelId, input.roomTypeId)
    const effectiveDemandFactor = surge
      ? Math.min(surge.surgeMultiplier, this.maxSurgeMultiplier)
      : (input.demandFactor ?? 1.0)

    // Compute rate
    const computed = this.calculator.compute({
      baseRate: input.baseRate,
      currentOccupancy: input.currentOccupancy,
      targetDate: input.targetDate,
      activeRules,
      demandFactor: effectiveDemandFactor,
      maxSurgeMultiplier: this.maxSurgeMultiplier,
    })

    // Persist
    const previousRate = await this.rateRepo
      .findByRoomTypeAndDate(input.roomTypeId, input.targetDate)
      .then(r => r?.calculatedRate ?? null)

    const rate = await this.rateRepo.upsert({
      organizationId: input.organizationId,
      hotelId: input.hotelId,
      roomTypeId: input.roomTypeId,
      inventoryDate: input.targetDate,
      calculatedRate: computed.calculatedRate,
      baseRate: computed.baseRate,
      appliedRuleId: computed.appliedRuleId,
      occupancyFactor: computed.occupancyFactor,
      demandFactor: computed.demandFactor,
    })

    // Cache the new rate
    await this.cache.setRate(input.roomTypeId, dateStr, computed.calculatedRate)

    // Publish event if rate changed
    if (previousRate === null || Math.abs(previousRate - computed.calculatedRate) > 0.01) {
      setImmediate(() => {
        void this.eventPublisher.publish('pricing.events', {
          eventType: PRICING_EVENTS.PRICING_UPDATED,
          aggregateId: input.roomTypeId,
          aggregateType: 'DynamicRate',
          organizationId: input.organizationId,
          payload: {
            hotelId: input.hotelId,
            organizationId: input.organizationId,
            roomTypeId: input.roomTypeId,
            targetDate: dateStr,
            previousRate: previousRate ?? input.baseRate,
            newRate: computed.calculatedRate,
            effectiveMultiplier: computed.effectiveMultiplier,
            triggeredBy: surge ? 'SURGE' : 'SCHEDULED',
          },
        }).catch(() => {})
      })
    }

    this.logger.debug({
      roomTypeId: input.roomTypeId,
      targetDate: dateStr,
      baseRate: input.baseRate,
      calculatedRate: computed.calculatedRate,
      multiplier: computed.effectiveMultiplier,
    }, 'Dynamic rate computed')

    return rate
  }
}
