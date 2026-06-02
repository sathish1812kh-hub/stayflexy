// FILE: src/modules/workflow-engine/types/index.ts

export interface WorkflowStep {
  name: string;
  action: string;
  params: Record<string, unknown>;
  retryable: boolean;
}

export interface WorkflowDefinition {
  name: string;
  version: number;
  description: string;
  triggerType: string;
  steps: WorkflowStep[];
}

export interface WorkflowTriggerContext {
  eventType: string;
  payload: Record<string, unknown>;
  organizationId: string;
  hotelId?: string;
  correlationId?: string;
}
