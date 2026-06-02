import type Redis from 'ioredis'
import type { Logger } from '@stayflexi/shared-logger'
import type { ReconciliationService } from '../reconciliation/ReconciliationService'

const RECONCILIATION_CACHE_KEY = 'stayflexi:reconciliation:latest:tick'
const RECONCILIATION_CACHE_TTL = 7200 // 2 hours in seconds
const DEFAULT_LOOKBACK_MS = 24 * 60 * 60 * 1000 // 24 hours

export class ReconciliationWorker {
  private timer: NodeJS.Timeout | null = null
  private running = false

  constructor(
    private readonly reconciliationService: ReconciliationService,
    private readonly redis: Redis,
    private readonly logger: Logger,
    private readonly intervalMs = 3_600_000 // 1 hour
  ) {}

  /**
   * Start the background reconciliation loop.
   * First tick fires immediately, subsequent ticks at intervalMs.
   */
  start(): void {
    if (this.running) {
      this.logger.warn('ReconciliationWorker is already running')
      return
    }
    this.running = true
    this.logger.info({ intervalMs: this.intervalMs }, 'ReconciliationWorker started')

    // Run the first tick immediately then schedule repeating
    void this.tick()
    this.timer = setInterval(() => { void this.tick() }, this.intervalMs)
  }

  /**
   * Stop the background reconciliation loop.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.running = false
    this.logger.info('ReconciliationWorker stopped')
  }

  private async tick(): Promise<void> {
    const tickId = Date.now()
    this.logger.info({ tickId }, 'Reconciliation tick started')

    try {
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - DEFAULT_LOOKBACK_MS)

      // Generate a health-check reconciliation report using a placeholder org
      // In production this would iterate over active organizations.
      // We log discrepancies and store the result for observability.
      const report = await this.reconciliationService.generateReport(
        'system', // placeholder for system-level health check
        startDate,
        endDate,
        undefined,
        'USD'
      )

      const result = {
        tickId,
        generatedAt: report.generatedAt,
        period: report.period,
        payments: {
          totalCollected: report.payments.totalCollected,
          totalRefunded: report.payments.totalRefunded,
          netRevenue: report.payments.netRevenue,
          transactionCount: report.payments.transactionCount,
        },
        discrepancy: report.discrepancy,
      }

      // Cache the latest result for 2 hours
      await this.redis.setex(
        RECONCILIATION_CACHE_KEY,
        RECONCILIATION_CACHE_TTL,
        JSON.stringify(result)
      )

      if (report.discrepancy.hasDiscrepancy) {
        this.logger.warn(
          { tickId, variance: report.discrepancy.variance, explanation: report.discrepancy.explanation },
          'Reconciliation discrepancy detected'
        )
      } else {
        this.logger.info({ tickId, netRevenue: report.payments.netRevenue }, 'Reconciliation tick completed — no discrepancy')
      }
    } catch (err: unknown) {
      this.logger.error({ err, tickId }, 'Reconciliation tick failed')
    }
  }
}
