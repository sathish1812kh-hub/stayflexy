import type { PrismaForecastRepository } from '../../infrastructure/database/PrismaForecastRepository'
import type { RevenueCache } from '../../infrastructure/cache/RevenueCache'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'
import type { ForecastDataPoint } from '../../domain/entities/ForecastDataPoint'
import { ForecastEngine } from '../../algorithms/ForecastEngine'
import { REVENUE_EVENTS } from '../../events/revenueEvents'

export interface GenerateForecastDto {
  organizationId: string
  hotelId: string
  targetDates: string[]          // YYYY-MM-DD
  historicalMetrics: Array<{
    date: string
    occupancyRate: number
    adr: number
    revpar: number
    bookingCount: number
  }>
  totalRooms: number
}

export class GenerateForecast {
  private readonly engine = new ForecastEngine()

  constructor(
    private readonly forecastRepo: PrismaForecastRepository,
    private readonly cache: RevenueCache,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger,
    private readonly horizonDays: number = 90,
  ) {}

  async execute(dto: GenerateForecastDto): Promise<ForecastDataPoint[]> {
    const output = this.engine.generate({
      hotelId: dto.hotelId,
      organizationId: dto.organizationId,
      targetDates: dto.targetDates.slice(0, this.horizonDays),
      historicalMetrics: dto.historicalMetrics,
      totalRooms: dto.totalRooms,
    })

    const count = await this.forecastRepo.upsertMany(output.forecasts)

    const avgOccupancy = output.forecasts.reduce((s, f) => s + f.projectedOccupancy, 0) / output.forecasts.length
    const avgRevPar = output.forecasts.reduce((s, f) => s + f.projectedRevPar, 0) / output.forecasts.length
    const confidence = output.forecasts[0]?.confidence ?? 'MEDIUM'

    setImmediate(() => {
      void this.eventPublisher.publish('pricing.events', {
        eventType: REVENUE_EVENTS.FORECAST_GENERATED,
        aggregateId: dto.hotelId,
        aggregateType: 'ForecastDataPoint',
        organizationId: dto.organizationId,
        payload: {
          hotelId: dto.hotelId,
          organizationId: dto.organizationId,
          forecastDates: dto.targetDates.slice(0, 5),
          averageProjectedOccupancy: Math.round(avgOccupancy * 10000) / 10000,
          averageProjectedRevPar: Math.round(avgRevPar * 100) / 100,
          confidence,
        },
      }).catch(() => {})
    })

    this.logger.info({
      hotelId: dto.hotelId,
      forecastCount: count,
      avgOccupancy: Math.round(avgOccupancy * 100),
      confidence,
    }, 'Forecast generated')

    return this.forecastRepo.findByHotelAndDateRange(
      dto.hotelId,
      dto.targetDates[0] ?? '',
      dto.targetDates[dto.targetDates.length - 1] ?? '',
    )
  }
}
