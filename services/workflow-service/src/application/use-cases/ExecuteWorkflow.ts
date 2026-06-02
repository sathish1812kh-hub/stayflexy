import type { WorkflowEngine } from '../../engines/WorkflowEngine'
import type { ExecuteWorkflowDto } from '../dtos/workflow.dto'
import type { Logger } from '@stayflexi/shared-logger'

export interface ExecuteWorkflowResult {
  executionId: string
}

export class ExecuteWorkflow {
  constructor(
    private readonly engine: WorkflowEngine,
    private readonly logger: Logger,
  ) {}

  async execute(
    dto: ExecuteWorkflowDto,
    organizationId: string,
    correlationId?: string,
  ): Promise<ExecuteWorkflowResult> {
    this.logger.info(
      {
        workflowName: dto.workflowName,
        triggerSource: dto.triggerSource,
        automationRuleId: dto.automationRuleId,
        organizationId,
        correlationId,
      },
      'Executing workflow',
    )

    const executionId = await this.engine.trigger({
      workflowName: dto.workflowName,
      triggerSource: dto.triggerSource,
      organizationId,
      hotelId: dto.hotelId,
      context: dto.context,
      idempotencyKey: dto.idempotencyKey,
      automationRuleId: dto.automationRuleId,
    })

    this.logger.info({ executionId, correlationId }, 'Workflow execution triggered')

    return { executionId }
  }
}
