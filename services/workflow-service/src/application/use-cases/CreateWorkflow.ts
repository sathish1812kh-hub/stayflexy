import type { WorkflowEngine } from '../../engines/WorkflowEngine'
import type { CreateWorkflowDto } from '../dtos/workflow.dto'
import type { Logger } from '@stayflexi/shared-logger'

export interface CreateWorkflowResult {
  executionId: string
}

export class CreateWorkflow {
  constructor(
    private readonly engine: WorkflowEngine,
    private readonly logger: Logger,
  ) {}

  async execute(
    dto: CreateWorkflowDto,
    organizationId: string,
    correlationId?: string,
  ): Promise<CreateWorkflowResult> {
    this.logger.info(
      {
        workflowName: dto.workflowName,
        triggerSource: dto.triggerSource,
        organizationId,
        correlationId,
      },
      'Creating workflow execution',
    )

    const executionId = await this.engine.trigger({
      workflowName: dto.workflowName,
      triggerSource: dto.triggerSource,
      organizationId,
      hotelId: dto.hotelId,
      context: dto.context,
      idempotencyKey: dto.idempotencyKey,
    })

    this.logger.info({ executionId, correlationId }, 'Workflow execution created')

    return { executionId }
  }
}
