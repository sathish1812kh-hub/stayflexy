import type { IAutomationRuleRepository } from '../domain/repositories/IAutomationRuleRepository'
import type { WorkflowEngine } from '../engines/WorkflowEngine'
import type { Logger } from '@stayflexi/shared-logger'

export class WorkflowScheduler {
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false

  constructor(
    private readonly ruleRepo: IAutomationRuleRepository,
    private readonly engine: WorkflowEngine,
    private readonly logger: Logger,
    private readonly intervalMs = 300000, // 5 min
  ) {}

  start(): void {
    if (this.running) return
    this.running = true
    this.logger.info({ intervalMs: this.intervalMs }, 'Workflow scheduler started')
    this.timer = setInterval(() => {
      void this.runScheduled().catch(err =>
        this.logger.error({ err }, 'Scheduler tick failed'),
      )
    }, this.intervalMs)
    if (this.timer.unref) this.timer.unref()
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
      this.running = false
    }
    this.logger.info('Workflow scheduler stopped')
  }

  private async runScheduled(): Promise<void> {
    // Find all organizations with SCHEDULED automation rules.
    // In production: query across all orgs using this.ruleRepo.findActiveByTrigger('SCHEDULED', orgId)
    // and trigger via this.engine.triggerByEvent for each org.
    // For now, skip as we need multi-tenant org discovery context.
    this.logger.debug('Workflow scheduler tick (no scheduled rules to process)')
  }
}
