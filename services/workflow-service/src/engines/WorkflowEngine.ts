import type { IWorkflowExecutionRepository } from '../domain/repositories/IWorkflowExecutionRepository'
import type { IAutomationRuleRepository } from '../domain/repositories/IAutomationRuleRepository'
import type { WorkflowCache } from '../infrastructure/cache/WorkflowCache'
import type { ConditionEvaluator, Condition } from './ConditionEvaluator'
import type { WorkflowStepExecutor, ActionDescriptor } from './WorkflowStepExecutor'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

export interface WorkflowTriggerRequest {
  workflowName: string
  triggerSource: string
  organizationId: string
  hotelId?: string
  context: Record<string, unknown>
  idempotencyKey?: string
  automationRuleId?: string
}

export class WorkflowEngine {
  constructor(
    private readonly executionRepo: IWorkflowExecutionRepository,
    private readonly ruleRepo: IAutomationRuleRepository,
    private readonly cache: WorkflowCache,
    private readonly conditionEvaluator: ConditionEvaluator,
    private readonly stepExecutor: WorkflowStepExecutor,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger,
  ) {}

  async trigger(request: WorkflowTriggerRequest): Promise<string> {
    // Idempotency check
    if (request.idempotencyKey) {
      const existing = await this.cache.getIdempotencyResult(request.idempotencyKey)
      if (existing) {
        this.logger.debug(
          { idempotencyKey: request.idempotencyKey },
          'Workflow idempotency hit',
        )
        return existing
      }
      const dbExisting = await this.executionRepo.findByIdempotencyKey(
        request.idempotencyKey,
      )
      if (dbExisting && !dbExisting.isPending()) return dbExisting.id
    }

    const execution = await this.executionRepo.create({
      workflowName: request.workflowName,
      automationRuleId: request.automationRuleId,
      triggerSource: request.triggerSource,
      executionPayload: request.context,
      idempotencyKey: request.idempotencyKey,
      organizationId: request.organizationId,
      hotelId: request.hotelId,
    })

    if (request.idempotencyKey) {
      await this.cache.setIdempotencyResult(request.idempotencyKey, execution.id)
    }

    // Execute asynchronously — HTTP returns executionId immediately
    setImmediate(() => {
      void this.runExecution(execution.id, request)
    })

    return execution.id
  }

  async triggerByEvent(
    triggerSource: string,
    organizationId: string,
    context: Record<string, unknown>,
  ): Promise<void> {
    const rules = await this.ruleRepo.findActiveByTrigger(triggerSource, organizationId)
    for (const rule of rules) {
      const conditions = this.parseConditions(rule.conditionPayload)
      if (this.conditionEvaluator.evaluate(conditions, context)) {
        await this.trigger({
          workflowName: rule.ruleName,
          triggerSource,
          organizationId,
          hotelId: rule.hotelId,
          context,
          automationRuleId: rule.id,
          idempotencyKey: `${rule.id}:${triggerSource}:${Date.now()}`,
        })
      }
    }
  }

  private parseConditions(payload: unknown): Condition[] {
    if (!Array.isArray(payload)) return []
    return payload.filter(
      (c): c is Condition => typeof c === 'object' && c !== null,
    )
  }

  private async runExecution(
    executionId: string,
    request: WorkflowTriggerRequest,
  ): Promise<void> {
    const locked = await this.cache.getExecutionLock(executionId)
    if (!locked) {
      this.logger.warn({ executionId }, 'Failed to acquire execution lock')
      return
    }

    const startedAt = Date.now()
    try {
      await this.executionRepo.updateStatus(executionId, 'RUNNING', {
        startedAt: new Date(),
      })
      this.publishEvent('workflow.started', executionId, request)

      // If tied to an automation rule, get its action
      let result: unknown = null
      if (request.automationRuleId) {
        const rule = await this.ruleRepo.findById(request.automationRuleId)
        if (rule) {
          const action = this.parseAction(rule.actionPayload)
          if (action) {
            const stepResult = await this.stepExecutor.execute(action, request.context)
            result = stepResult.output
            if (!stepResult.success) {
              throw new Error(stepResult.errorMessage ?? 'Step execution failed')
            }
          }
        }
      }

      await this.executionRepo.updateStatus(executionId, 'COMPLETED', {
        completedAt: new Date(),
        resultPayload: { result, durationMs: Date.now() - startedAt },
      })
      this.publishEvent('workflow.completed', executionId, request)
      this.logger.info(
        { executionId, durationMs: Date.now() - startedAt },
        'Workflow completed',
      )
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Workflow execution error'
      await this.executionRepo.updateStatus(executionId, 'FAILED', {
        completedAt: new Date(),
        failureReason: errorMessage,
      })
      this.publishEvent('workflow.failed', executionId, request)
      this.logger.error({ executionId, err }, 'Workflow execution failed')
    } finally {
      await this.cache.releaseExecutionLock(executionId)
    }
  }

  private parseAction(payload: unknown): ActionDescriptor | null {
    if (typeof payload !== 'object' || payload === null) return null
    const p = payload as Record<string, unknown>
    if (typeof p['type'] !== 'string') return null
    return {
      type: p['type'],
      params: (p['params'] as Record<string, unknown>) ?? {},
    }
  }

  private publishEvent(
    eventType: string,
    executionId: string,
    request: WorkflowTriggerRequest,
  ): void {
    setImmediate(() => {
      void (async () => {
        try {
          await this.eventPublisher.publish('workflow.events', {
            eventType,
            aggregateId: executionId,
            aggregateType: 'WorkflowExecution',
            organizationId: request.organizationId,
            payload: {
              executionId,
              workflowName: request.workflowName,
              triggerSource: request.triggerSource,
            },
          })
        } catch {
          // fire-and-forget
        }
      })()
    })
  }
}
