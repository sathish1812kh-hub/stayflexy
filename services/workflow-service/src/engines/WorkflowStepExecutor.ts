import type { Logger } from '@stayflexi/shared-logger'

export interface ActionDescriptor {
  type: string
  params: Record<string, unknown>
}

export interface StepResult {
  success: boolean
  output?: unknown
  errorMessage?: string
}

export class WorkflowStepExecutor {
  constructor(private readonly logger: Logger) {}

  async execute(
    action: ActionDescriptor,
    context: Record<string, unknown>,
  ): Promise<StepResult> {
    this.logger.debug(
      { actionType: action.type, params: action.params },
      'Executing workflow step',
    )

    switch (action.type) {
      case 'SEND_NOTIFICATION':
        return this.executeNotificationAction(action.params, context)
      case 'UPDATE_STATUS':
        return this.executeStatusUpdateAction(action.params, context)
      case 'ESCALATE':
        return this.executeEscalationAction(action.params, context)
      case 'LOG':
        return this.executeLogAction(action.params, context)
      case 'HTTP_CALLBACK':
        return this.executeCallbackAction(action.params, context)
      default:
        this.logger.warn({ actionType: action.type }, 'Unknown workflow action type')
        return { success: false, errorMessage: `Unknown action type: ${action.type}` }
    }
  }

  private async executeNotificationAction(
    params: Record<string, unknown>,
    _ctx: Record<string, unknown>,
  ): Promise<StepResult> {
    // In production: call notification-service API or publish Kafka event
    this.logger.info(
      { recipient: params['recipient'], channel: params['channel'] },
      'Workflow: send notification (simulation)',
    )
    return {
      success: true,
      output: { notified: params['recipient'], channel: params['channel'] },
    }
  }

  private async executeStatusUpdateAction(
    params: Record<string, unknown>,
    _ctx: Record<string, unknown>,
  ): Promise<StepResult> {
    this.logger.info(
      { entity: params['entity'], status: params['status'] },
      'Workflow: status update (simulation)',
    )
    return {
      success: true,
      output: { updated: params['entity'], newStatus: params['status'] },
    }
  }

  private async executeEscalationAction(
    params: Record<string, unknown>,
    _ctx: Record<string, unknown>,
  ): Promise<StepResult> {
    this.logger.warn(
      { escalateTo: params['escalateTo'], severity: params['severity'] },
      'Workflow: escalation triggered',
    )
    return {
      success: true,
      output: { escalated: true, assignedTo: params['escalateTo'] },
    }
  }

  private async executeLogAction(
    params: Record<string, unknown>,
    _ctx: Record<string, unknown>,
  ): Promise<StepResult> {
    this.logger.info({ message: params['message'] }, 'Workflow: log action')
    return { success: true, output: { logged: true } }
  }

  private async executeCallbackAction(
    params: Record<string, unknown>,
    _ctx: Record<string, unknown>,
  ): Promise<StepResult> {
    // In production: make authenticated HTTP call to configured endpoint
    this.logger.info({ url: params['url'] }, 'Workflow: HTTP callback (simulation)')
    return { success: true, output: { called: params['url'] } }
  }
}
