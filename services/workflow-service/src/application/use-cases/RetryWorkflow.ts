import { NotFoundError, ForbiddenError, BadRequestError } from '@stayflexi/shared-errors'
import type { IWorkflowExecutionRepository } from '../../domain/repositories/IWorkflowExecutionRepository'
import type { WorkflowEngine } from '../../engines/WorkflowEngine'
import type { Logger } from '@stayflexi/shared-logger'

export interface RetryWorkflowResult {
  executionId: string
  newExecutionId: string
}

export class RetryWorkflow {
  constructor(
    private readonly executionRepo: IWorkflowExecutionRepository,
    private readonly engine: WorkflowEngine,
    private readonly logger: Logger,
  ) {}

  async execute(
    executionId: string,
    organizationId: string,
    correlationId?: string,
  ): Promise<RetryWorkflowResult> {
    const execution = await this.executionRepo.findById(executionId)
    if (!execution) {
      throw new NotFoundError(`Workflow execution not found: ${executionId}`)
    }

    if (!execution.belongsToOrganization(organizationId)) {
      throw new ForbiddenError('Access to this workflow execution is forbidden')
    }

    if (!execution.canRetry()) {
      throw new BadRequestError(
        `Workflow execution cannot be retried. Status: ${execution.executionStatus}, RetryCount: ${execution.retryCount}`,
      )
    }

    // Increment the retry counter on the existing execution
    await this.executionRepo.incrementRetry(executionId)

    this.logger.info(
      { executionId, retryCount: execution.retryCount + 1, correlationId },
      'Retrying workflow execution',
    )

    // Trigger a fresh execution with the original context
    const newExecutionId = await this.engine.trigger({
      workflowName: execution.workflowName,
      triggerSource: execution.triggerSource,
      organizationId: execution.organizationId,
      hotelId: execution.hotelId ?? undefined,
      context: (execution.executionPayload as Record<string, unknown>) ?? {},
      automationRuleId: execution.automationRuleId ?? undefined,
    })

    this.logger.info(
      { executionId, newExecutionId, correlationId },
      'Workflow retry triggered',
    )

    return { executionId, newExecutionId }
  }
}
