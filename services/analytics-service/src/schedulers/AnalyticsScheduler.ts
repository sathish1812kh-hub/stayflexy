import type { PrismaClient } from '@prisma/client'
import type { Logger } from '@stayflexi/shared-logger'
import type { KpiCalculator } from '../aggregators/KpiCalculator'
import type { IRevenueMetricRepository } from '../domain/repositories/IRevenueMetricRepository'
import type { AnalyticsCache } from '../infrastructure/cache/AnalyticsCache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = PrismaClient & Record<string, any>

export class AnalyticsScheduler {
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false

  constructor(
    private readonly db: PrismaClient,
    private readonly kpiCalculator: KpiCalculator,
    private readonly revenueMetricRepo: IRevenueMetricRepository,
    private readonly cache: AnalyticsCache,
    private readonly logger: Logger,
    private readonly intervalMs = 3_600_000, // 1 hour
  ) {}

  start(): void {
    if (this.running) return
    this.running = true
    this.logger.info({ intervalMs: this.intervalMs }, 'AnalyticsScheduler started')

    void this.tick().catch(err => this.logger.error({ err }, 'Initial scheduler tick failed'))

    this.timer = setInterval(() => {
      void this.tick().catch(err => this.logger.error({ err }, 'Scheduler tick failed'))
    }, this.intervalMs)

    if (this.timer.unref) this.timer.unref()
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
    this.running = false
    this.logger.info('AnalyticsScheduler stopped')
  }

  private async tick(): Promise<void> {
    const tickStart = Date.now()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    this.logger.info({ targetDate: yesterday.toISOString().split('T')[0] }, 'Analytics scheduler tick')

    // Find active hotels from yesterday's bookings
    const activeHotels = await this.db.booking.groupBy({
      by: ['hotelId', 'organizationId'],
      where: { createdAt: { gte: yesterday, lt: new Date() } },
      _count: { id: true },
    }).catch((): any[] => [])

    if (activeHotels.length === 0) {
      this.logger.debug('No active hotels found for analytics aggregation')
      return
    }

    this.logger.info({ hotelCount: activeHotels.length }, 'Processing analytics aggregation jobs')

    const jobModel = (this.db as AnyClient)['analyticsAggregationJob']

    for (const hotel of activeHotels) {
      await this.processHotelAggregation(hotel.hotelId, hotel.organizationId, yesterday, jobModel)
    }

    this.logger.info({ durationMs: Date.now() - tickStart, hotelCount: activeHotels.length }, 'Analytics scheduler tick completed')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async processHotelAggregation(hotelId: string, organizationId: string, targetDate: Date, jobModel: any): Promise<void> {
    let jobId: string | null = null

    try {
      // Create aggregation job record (idempotent upsert)
      if (jobModel) {
        const job = await jobModel.upsert({
          where: { hotelId_jobType_targetDate: { hotelId, jobType: 'daily', targetDate } },
          create: {
            organizationId, hotelId, jobType: 'daily',
            jobStatus: 'RUNNING', targetDate, startedAt: new Date(),
          },
          update: {
            jobStatus: 'RUNNING', startedAt: new Date(),
            retryCount: { increment: 1 },
          },
        }).catch(() => null)
        jobId = job?.id ?? null

        // Skip if job already completed successfully
        const existing = await jobModel.findUnique({
          where: { hotelId_jobType_targetDate: { hotelId, jobType: 'daily', targetDate } },
        }).catch(() => null)
        if (existing?.jobStatus === 'COMPLETED') {
          this.logger.debug({ hotelId, targetDate }, 'Aggregation job already completed — skipping')
          return
        }
      }

      const kpis = await this.kpiCalculator.calculateKpis(hotelId, organizationId, targetDate, targetDate)
      await this.revenueMetricRepo.upsert({
        organizationId, hotelId, metricDate: targetDate,
        occupancyRate: kpis.occupancyRate, adr: kpis.adr, revpar: kpis.revpar,
        totalRevenue: kpis.totalRevenue, bookingCount: kpis.totalBookings,
        cancellationRate: kpis.cancellationRate,
      })
      await this.cache.invalidateKpis(hotelId)

      if (jobModel && jobId) {
        await jobModel.update({
          where: { id: jobId },
          data: { jobStatus: 'COMPLETED', completedAt: new Date() },
        }).catch(() => undefined)
      }

      this.logger.debug({ hotelId, targetDate }, 'Hotel aggregation completed')
    } catch (err: unknown) {
      this.logger.error({ err, hotelId, targetDate }, 'Hotel aggregation failed')
      if (jobModel && jobId) {
        await jobModel.update({
          where: { id: jobId },
          data: {
            jobStatus: 'FAILED',
            errorMessage: err instanceof Error ? err.message.slice(0, 500) : 'Unknown error',
          },
        }).catch(() => undefined)
      }
    }
  }
}
