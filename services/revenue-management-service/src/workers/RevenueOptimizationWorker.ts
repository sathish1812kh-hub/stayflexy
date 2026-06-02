import type { Logger } from '@stayflexi/shared-logger'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { PrismaRevenueTargetRepository } from '../infrastructure/database/PrismaRevenueTargetRepository'
import type { PrismaForecastRepository } from '../infrastructure/database/PrismaForecastRepository'
import type { PrismaRateRecommendationRepository } from '../infrastructure/database/PrismaRateRecommendationRepository'
import type { RevenueCache } from '../infrastructure/cache/RevenueCache'
import { RevenueOptimizer } from '../algorithms/RevenueOptimizer'
import { REVENUE_EVENTS } from '../events/revenueEvents'

export class RevenueOptimizationWorker {
  private readonly optimizer = new RevenueOptimizer()
  private running = false

  constructor(
    private readonly targetRepo: PrismaRevenueTargetRepository,
    private readonly forecastRepo: PrismaForecastRepository,
    private readonly recommendationRepo: PrismaRateRecommendationRepository,
    private readonly cache: RevenueCache,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger,
  ) {}

  async runOptimizationCycle(hotelId: string, organizationId: string, targetPeriod: string): Promise<void> {
    const target = await this.targetRepo.findByHotelAndPeriod(hotelId, targetPeriod)
    if (!target || !target.belongsToOrganization(organizationId)) return

    // Derive date range for the target period
    const [year, month] = targetPeriod.split('-').map(Number) as [number, number]
    const startDate = `${targetPeriod}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${targetPeriod}-${String(lastDay).padStart(2, '0')}`

    const forecasts = await this.forecastRepo.findByHotelAndDateRange(hotelId, startDate, endDate)
    if (!forecasts.length) return

    const targetProps = target.toJSON()
    let totalProjectedRevenue = 0
    let totalProjectedRevPar = 0
    let totalProjectedOccupancy = 0

    for (const forecast of forecasts) {
      const forecastProps = forecast.toJSON()
      const result = this.optimizer.optimize({
        organizationId,
        hotelId,
        roomTypeId: 'ALL',
        targetDate: forecastProps.forecastDate,
        basePrice: forecastProps.projectedAdr,
        currentOccupancy: forecastProps.projectedOccupancy,
        forecast: forecastProps,
        target: targetProps,
      })

      totalProjectedRevenue += result.recommendation.recommendedPrice * forecastProps.totalRooms * forecastProps.projectedOccupancy
      totalProjectedRevPar += result.recommendation.recommendedPrice * forecastProps.projectedOccupancy
      totalProjectedOccupancy += forecastProps.projectedOccupancy
    }

    const avgOccupancy = totalProjectedOccupancy / forecasts.length
    const avgRevPar = totalProjectedRevPar / forecasts.length
    const avgAdr = avgOccupancy > 0 ? avgRevPar / avgOccupancy : 0

    setImmediate(() => {
      void this.eventPublisher.publish('pricing.events', {
        eventType: REVENUE_EVENTS.REVENUE_OPTIMIZED,
        aggregateId: hotelId,
        aggregateType: 'RevenueTarget',
        organizationId,
        payload: {
          hotelId,
          organizationId,
          targetPeriod,
          projectedRevenue: Math.round(totalProjectedRevenue * 100) / 100,
          projectedRevPar: Math.round(avgRevPar * 100) / 100,
          projectedOccupancy: Math.round(avgOccupancy * 10000) / 10000,
          recommendedAdr: Math.round(avgAdr * 100) / 100,
        },
      }).catch(() => {})
    })

    this.logger.info({
      hotelId,
      targetPeriod,
      projectedRevPar: Math.round(avgRevPar * 100) / 100,
      avgOccupancy: Math.round(avgOccupancy * 100),
    }, 'Revenue optimization cycle completed')
  }

  get isRunning(): boolean { return this.running }

  start(): void {
    this.running = true
    this.logger.info('RevenueOptimizationWorker started')
  }

  stop(): void {
    this.running = false
    this.logger.info('RevenueOptimizationWorker stopped')
  }
}
