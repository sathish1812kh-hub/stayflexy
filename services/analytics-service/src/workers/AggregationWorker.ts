import type { PrismaClient } from '@prisma/client'
import type { IRevenueMetricRepository } from '../domain/repositories/IRevenueMetricRepository'
import type { KpiCalculator } from '../aggregators/KpiCalculator'
import type { AnalyticsCache } from '../infrastructure/cache/AnalyticsCache'
import type { Logger } from '@stayflexi/shared-logger'

export class AggregationWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false

  constructor(
    private readonly db: PrismaClient,
    private readonly revenueMetricRepo: IRevenueMetricRepository,
    private readonly kpiCalculator: KpiCalculator,
    private readonly cache: AnalyticsCache,
    private readonly logger: Logger,
    private readonly intervalMs = 3600000, // 1 hour default
  ) {}

  start(): void {
    if (this.running) return
    this.running = true
    this.logger.info({ intervalMs: this.intervalMs }, 'Analytics aggregation worker started')

    void this.runAggregation().catch(err => this.logger.error({ err }, 'Initial aggregation failed'))

    this.timer = setInterval(() => {
      void this.runAggregation().catch(err => this.logger.error({ err }, 'Aggregation tick failed'))
    }, this.intervalMs)

    if (this.timer.unref) this.timer.unref()
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; this.running = false }
    this.logger.info('Analytics aggregation worker stopped')
  }

  private async runAggregation(): Promise<void> {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    // Find all hotels that had activity yesterday
    const activeHotels = await this.db.booking.groupBy({
      by: ['hotelId', 'organizationId'],
      where: { createdAt: { gte: yesterday, lt: new Date() } },
      _count: { id: true },
    })

    this.logger.info({ hotelCount: activeHotels.length }, 'Running analytics aggregation')

    for (const hotel of activeHotels) {
      try {
        const kpis = await this.kpiCalculator.calculateKpis(
          hotel.hotelId, hotel.organizationId, yesterday, yesterday,
        )
        await this.revenueMetricRepo.upsert({
          organizationId: hotel.organizationId,
          hotelId: hotel.hotelId,
          metricDate: yesterday,
          occupancyRate: kpis.occupancyRate,
          adr: kpis.adr,
          revpar: kpis.revpar,
          totalRevenue: kpis.totalRevenue,
          bookingCount: kpis.totalBookings,
          cancellationRate: kpis.cancellationRate,
        })
        await this.cache.invalidateKpis(hotel.hotelId)
        this.logger.debug({ hotelId: hotel.hotelId }, 'Hotel metrics aggregated')
      } catch (err) {
        this.logger.error({ hotelId: hotel.hotelId, err }, 'Failed to aggregate hotel metrics')
      }
    }
  }
}
