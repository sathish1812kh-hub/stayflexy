import type { SyncProcessor } from '../processors/SyncProcessor'
import type { Logger } from '@stayflexi/shared-logger'

export class RetryWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private readonly intervalMs: number
  private running = false

  constructor(
    private readonly processor: SyncProcessor,
    private readonly logger: Logger,
    intervalMs = 60000, // 1 minute default
  ) {
    this.intervalMs = intervalMs
  }

  start(): void {
    if (this.running) {
      this.logger.warn('OTA retry worker is already running')
      return
    }

    this.running = true
    this.logger.info({ intervalMs: this.intervalMs }, 'OTA retry worker started')

    // Run immediately on start, then on interval
    void this.processor.processRetries().catch((err: unknown) => {
      this.logger.error({ err }, 'OTA retry worker initial tick failed')
    })

    this.timer = setInterval(() => {
      void this.processor.processRetries().catch((err: unknown) => {
        this.logger.error({ err }, 'OTA retry worker tick failed')
      })
    }, this.intervalMs)

    // Allow Node.js to exit even if timer is active
    if (this.timer.unref) {
      this.timer.unref()
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
      this.running = false
      this.logger.info('OTA retry worker stopped')
    }
  }

  isRunning(): boolean {
    return this.running
  }
}
