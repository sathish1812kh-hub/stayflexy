import type { IWorkflowExecutionRepository } from '../domain/repositories/IWorkflowExecutionRepository'
import type { WorkflowEngine } from '../engines/WorkflowEngine'
import type { Logger } from '@stayflexi/shared-logger'

export class WorkflowRetryWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false

  constructor(
    private readonly executionRepo: IWorkflowExecutionRepository,
    private readonly engine: WorkflowEngine,
    private readonly logger: Logger,
    private readonly intervalMs = 60000,
  ) {}

  start(): void {
    if (this.running) return
    this.running = true
    this.logger.info({ intervalMs: this.intervalMs }, 'Workflow retry worker started')
    this.timer = setInterval(() => {
      void this.processRetries().catch(err =>
        this.logger.error({ err }, 'Workflow retry tick failed'),
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
    this.logger.info('Workflow retry worker stopped')
  }

  private async processRetries(): Promise<void> {
    const pending = await this.executionRepo.findPendingRetries()
    if (pending.length === 0) return

    this.logger.info({ count: pending.length }, 'Processing workflow retries')

    for (const exec of pending) {
      try {
        const updated = await this.executionRepo.incrementRetry(exec.id)
        await this.engine.trigger({
          workflowName: exec.workflowName,
          triggerSource: exec.triggerSource,
          organizationId: exec.organizationId,
          hotelId: exec.hotelId ?? undefined,
          context: (exec.executionPayload as Record<string, unknown>) ?? {},
          automationRuleId: exec.automationRuleId ?? undefined,
        })
        this.logger.info(
          { executionId: exec.id, retryCount: updated.retryCount },
          'Workflow retry triggered',
        )
      } catch (err) {
        this.logger.error({ executionId: exec.id, err }, 'Failed to retry workflow')
      }
    }
  }
}
