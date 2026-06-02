import type { WorkflowExecution } from '../entities/WorkflowExecution'

export interface IWorkflowExecutionRepository {
  findById(id: string): Promise<WorkflowExecution | null>
  findByIdempotencyKey(key: string): Promise<WorkflowExecution | null>
  findByOrganization(
    organizationId: string,
    filters?: WorkflowFilters,
  ): Promise<{ data: WorkflowExecution[]; total: number }>
  findPendingRetries(): Promise<WorkflowExecution[]>
  create(data: CreateWorkflowExecutionData): Promise<WorkflowExecution>
  updateStatus(
    id: string,
    status: string,
    data?: UpdateWorkflowData,
  ): Promise<WorkflowExecution>
  incrementRetry(id: string): Promise<WorkflowExecution>
}

export interface WorkflowFilters {
  hotelId?: string
  executionStatus?: string
  triggerSource?: string
  workflowName?: string
  page?: number
  limit?: number
}

export interface CreateWorkflowExecutionData {
  workflowName: string
  automationRuleId?: string
  triggerSource: string
  executionPayload?: unknown
  idempotencyKey?: string
  organizationId: string
  hotelId?: string
}

export interface UpdateWorkflowData {
  startedAt?: Date
  completedAt?: Date
  failureReason?: string
  resultPayload?: unknown
}
