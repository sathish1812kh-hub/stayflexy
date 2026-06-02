// FILE: src/modules/automation/types/index.ts

export type AutomationTriggerTypeType =
  | "BOOKING_CREATED"
  | "BOOKING_CANCELLED"
  | "PAYMENT_COMPLETED"
  | "PAYMENT_FAILED"
  | "INVENTORY_LOW"
  | "OCCUPANCY_THRESHOLD"
  | "OTA_SYNC_FAILED"
  | "HOUSEKEEPING_COMPLETED"
  | "MAINTENANCE_OPENED"
  | "SCHEDULED"
  | "MANUAL";

export type WorkflowExecutionStatusType =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "RETRYING"
  | "CANCELLED"
  | "AWAITING_APPROVAL";

export type AutomationRuleStatusType = "ACTIVE" | "INACTIVE" | "DRAFT";

export interface AutomationRule {
  id: string;
  organizationId: string;
  hotelId: string;
  ruleName: string;
  triggerType: AutomationTriggerTypeType;
  conditionPayload: Record<string, unknown>;
  actionPayload: Record<string, unknown>;
  ruleStatus: AutomationRuleStatusType;
  priority: number;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowExecution {
  id: string;
  workflowName: string;
  automationRuleId: string | null;
  executionStatus: WorkflowExecutionStatusType;
  triggerSource: string;
  executionPayload: Record<string, unknown> | null;
  resultPayload: Record<string, unknown> | null;
  retryCount: number;
  idempotencyKey: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  failureReason: string | null;
  organizationId: string;
  hotelId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAutomationRuleData {
  organizationId: string;
  hotelId: string;
  ruleName: string;
  triggerType: AutomationTriggerTypeType;
  conditionPayload: Record<string, unknown>;
  actionPayload: Record<string, unknown>;
  priority?: number;
  createdById: string;
}

export type UpdateAutomationRuleData = Partial<{
  ruleName: string;
  conditionPayload: Record<string, unknown>;
  actionPayload: Record<string, unknown>;
  ruleStatus: AutomationRuleStatusType;
  priority: number;
}>;

export interface CreateWorkflowExecutionData {
  workflowName: string;
  automationRuleId?: string;
  triggerSource: string;
  executionPayload?: Record<string, unknown>;
  organizationId: string;
  hotelId?: string;
  idempotencyKey?: string;
}

export interface RuleFilter {
  organizationId?: string;
  hotelId?: string;
  triggerType?: AutomationTriggerTypeType;
  ruleStatus?: AutomationRuleStatusType;
  page?: number;
  limit?: number;
}

export interface ExecutionFilter {
  organizationId?: string;
  hotelId?: string;
  workflowName?: string;
  executionStatus?: WorkflowExecutionStatusType;
  page?: number;
  limit?: number;
}

export interface ConditionPredicate {
  field: string;
  operator: "eq" | "gt" | "lt" | "gte" | "lte" | "contains" | "in";
  value: unknown;
}

export interface ActionDescriptor {
  type: string;
  params: Record<string, unknown>;
}
