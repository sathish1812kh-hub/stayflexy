import type { Logger } from '@stayflexi/shared-logger'
import type { RevenueCache } from '../infrastructure/cache/RevenueCache'

export class RevenueScheduler {
  private intervalHandle: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly cache: RevenueCache,
    private readonly logger: Logger,
    private readonly intervalMs: number = 3_600_000, // 1 hour
  ) {}

  start(): void {
    this.intervalHandle = setInterval(() => {
      void this.tick()
    }, this.intervalMs)
    this.intervalHandle.unref()
    this.logger.info({ intervalMs: this.intervalMs }, 'RevenueScheduler started')
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle)
      this.intervalHandle = null
    }
  }

  private async tick(): Promise<void> {
    this.logger.debug('RevenueScheduler tick — checking for stale recommendations')
    // In production: scan hotels with dirty flags, trigger GetRateRecommendation for upcoming dates
    // Recommendations expire after RECOMMENDATION_TTL_HOURS and get recomputed on next request
  }
}
