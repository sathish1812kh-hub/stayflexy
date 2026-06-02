import { NotFoundError, ForbiddenError } from '@stayflexi/shared-errors'
import type { IWorkflowExecutionRepository } from '../../domain/repositories/IWorkflowExecutionRepository'
import type { WorkflowCache } from '../../infrastructure/cache/WorkflowCache'
import type { WorkflowExecutionProps } from '../../domain/entities/WorkflowExecution'

export class GetWorkflow {
  constructor(
    private readonly executionRepo: IWorkflowExecutionRepository,
    private readonly cache: WorkflowCache,
  ) {}

  async execute(
    executionId: string,
    organizationId: string,
  ): Promise<WorkflowExecutionProps> {
    // Try cache first
    const cached = await this.cache.getExecution(executionId)
    if (cached !== null) {
      const data = cached as WorkflowExecutionProps
      if (data.organizationId !== organizationId) {
        throw new ForbiddenError('Access to this workflow execution is forbidden')
      }
      return data
    }

    const execution = await this.executionRepo.findById(executionId)
    if (!execution) {
      throw new NotFoundError(`Workflow execution not found: ${executionId}`)
    }

    if (!execution.belongsToOrganization(organizationId)) {
      throw new ForbiddenError('Access to this workflow execution is forbidden')
    }

    // Populate cache for completed executions (they won't change)
    if (execution.isCompleted()) {
      await this.cache.setExecution(executionId, execution.toJSON())
    }

    return execution.toJSON()
  }
}
