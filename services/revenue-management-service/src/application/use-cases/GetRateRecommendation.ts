import { NotFoundError, ForbiddenError } from '@stayflexi/shared-errors'
import type { PrismaRateRecommendationRepository } from '../../infrastructure/database/PrismaRateRecommendationRepository'
import type { PrismaForecastRepository } from '../../infrastructure/database/PrismaForecastRepository'
import type { PrismaRevenueTargetRepository } from '../../infrastructure/database/PrismaRevenueTargetRepository'
import type { RevenueCache } from '../../infrastructure/cache/RevenueCache'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'
import type { RateRecommendation } from '../../domain/entities/RateRecommendation'
import { RevenueOptimizer } from '../../algorithms/RevenueOptimizer'
import { REVENUE_EVENTS } from '../../events/revenueEvents'

export interface GetRecommendationInput {
  organizationId: string
  hotelId: string
  roomTypeId: string
  targetDate: string           // YYYY-MM-DD
  basePrice: number
  currentOccupancy: number     // 0.0–1.0
  maxPrice?: number
  minPrice?: number
}

export class GetRateRecommendation {
  private readonly optimizer = new RevenueOptimizer()

  constructor(
    private readonly recommendationRepo: PrismaRateRecommendationRepository,
    private readonly forecastRepo: PrismaForecastRepository,
    private readonly targetRepo: PrismaRevenueTargetRepository,
    private readonly cache: RevenueCache,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger,
  ) {}

  async execute(input: GetRecommendationInput): Promise<RateRecommendation> {
    // Check cache
    const cached = await this.cache.getRecommendation(input.roomTypeId, input.targetDate)
    if (cached) {
      const existing = await this.recommendationRepo.findByRoomTypeAndDate(input.roomTypeId, input.targetDate)
      if (existing && !existing.isExpired && existing.belongsToOrganization(input.organizationId)) {
        return existing
      }
    }

    // Load forecast and target data
    const [forecast, targetPeriod] = await Promise.all([
      this.forecastRepo.findByHotelAndDate(input.hotelId, input.targetDate),
      input.targetDate.substring(0, 7), // YYYY-MM
    ])

    const target = await this.targetRepo.findByHotelAndPeriod(input.hotelId, targetPeriod)

    // Generate recommendation
    const result = this.optimizer.optimize({
      organizationId: input.organizationId,
      hotelId: input.hotelId,
      roomTypeId: input.roomTypeId,
      targetDate: input.targetDate,
      basePrice: input.basePrice,
      currentOccupancy: input.currentOccupancy,
      forecast,
      target: target?.toJSON() ?? null,
      maxPrice: input.maxPrice,
      minPrice: input.minPrice,
    })

    // Persist
    const recommendation = await this.recommendationRepo.upsert(result.recommendation)

    // Cache
    await this.cache.setRecommendation(input.roomTypeId, input.targetDate, recommendation.toJSON())

    setImmediate(() => {
      void this.eventPublisher.publish('pricing.events', {
        eventType: REVENUE_EVENTS.RECOMMENDATION_GENERATED,
        aggregateId: input.roomTypeId,
        aggregateType: 'RateRecommendation',
        organizationId: input.organizationId,
        payload: {
          hotelId: input.hotelId,
          organizationId: input.organizationId,
          roomTypeId: input.roomTypeId,
          targetDate: input.targetDate,
          recommendedPrice: recommendation.recommendedPrice,
          confidenceScore: recommendation.confidenceScore,
        },
      }).catch(() => {})
    })

    this.logger.debug({
      roomTypeId: input.roomTypeId,
      targetDate: input.targetDate,
      basePrice: input.basePrice,
      recommendedPrice: recommendation.recommendedPrice,
      confidence: recommendation.confidenceScore,
    }, 'Rate recommendation generated')

    return recommendation
  }
}
