export interface WorkflowExecutionProps {
  id: string
  workflowName: string
  automationRuleId: string | null
  executionStatus: string
  triggerSource: string
  executionPayload: unknown
  resultPayload: unknown
  retryCount: number
  idempotencyKey: string | null
  startedAt: Date | null
  completedAt: Date | null
  failureReason: string | null
  organizationId: string
  hotelId: string | null
  createdAt: Date
  updatedAt: Date
}

export class WorkflowExecution {
  constructor(private readonly props: WorkflowExecutionProps) {}

  get id() { return this.props.id }
  get workflowName() { return this.props.workflowName }
  get automationRuleId() { return this.props.automationRuleId }
  get executionStatus() { return this.props.executionStatus }
  get triggerSource() { return this.props.triggerSource }
  get executionPayload() { return this.props.executionPayload }
  get resultPayload() { return this.props.resultPayload }
  get retryCount() { return this.props.retryCount }
  get idempotencyKey() { return this.props.idempotencyKey }
  get startedAt() { return this.props.startedAt }
  get completedAt() { return this.props.completedAt }
  get failureReason() { return this.props.failureReason }
  get organizationId() { return this.props.organizationId }
  get hotelId() { return this.props.hotelId }
  get createdAt() { return this.props.createdAt }

  isPending(): boolean { return this.props.executionStatus === 'PENDING' }
  isRunning(): boolean { return this.props.executionStatus === 'RUNNING' }
  isCompleted(): boolean {
    return (
      this.props.executionStatus === 'COMPLETED' ||
      this.props.executionStatus === 'FAILED' ||
      this.props.executionStatus === 'CANCELLED'
    )
  }
  canRetry(): boolean {
    return this.props.executionStatus === 'FAILED' && this.props.retryCount < 3
  }
  belongsToOrganization(orgId: string): boolean {
    return this.props.organizationId === orgId
  }
  toJSON(): WorkflowExecutionProps { return { ...this.props } }
}
