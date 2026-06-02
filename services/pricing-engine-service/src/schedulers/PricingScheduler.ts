import type { Logger } from '@stayflexi/shared-logger'
import type { PricingCache } from '../infrastructure/cache/PricingCache'

export class PricingScheduler {
  private intervalHandle: ReturnType<typeof setInterval> | null = null
  private readonly RECOMPUTE_DAYS_AHEAD = 30

  constructor(
    private readonly cache: PricingCache,
    private readonly logger: Logger,
    private readonly intervalMs: number = 3_600_000, // 1 hour
  ) {}

  start(): void {
    this.intervalHandle = setInterval(() => {
      void this.tick()
    }, this.intervalMs)
    this.intervalHandle.unref()
    this.logger.info({ intervalMs: this.intervalMs }, 'PricingScheduler started')
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle)
      this.intervalHandle = null
    }
  }

  private async tick(): Promise<void> {
    this.logger.debug('PricingScheduler tick — checking for dirty hotel rates')
    // In production: query hotels, check dirty flags, trigger ComputeDynamicRate for each
    // Kept minimal here — actual recomputation triggered by occupancy events
  }
}
