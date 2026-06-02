// FILE: src/modules/automation/index.ts

// Types
export type {
  AutomationRule,
  WorkflowExecution,
  CreateAutomationRuleData,
  UpdateAutomationRuleData,
  CreateWorkflowExecutionData,
  RuleFilter,
  ExecutionFilter,
  ConditionPredicate,
  ActionDescriptor,
  AutomationTriggerTypeType,
  WorkflowExecutionStatusType,
  AutomationRuleStatusType,
} from "./types";

// Constants
export { AUTOMATION_ERRORS, ACTION_TYPES, MAX_RETRY_COUNT } from "./constants";

// DTOs
export {
  CreateAutomationRuleDto,
  UpdateAutomationRuleDto,
  RuleFilterDto,
  ExecutionFilterDto,
  TriggerWorkflowDto,
} from "./dto";
export type {
  CreateAutomationRuleDtoType,
  UpdateAutomationRuleDtoType,
  RuleFilterDtoType,
  ExecutionFilterDtoType,
  TriggerWorkflowDtoType,
} from "./dto";

// Validators
export {
  validateCreateAutomationRule,
  validateUpdateAutomationRule,
  validateRuleFilter,
  validateExecutionFilter,
  validateTriggerWorkflow,
} from "./validators";

// Repositories
export { PrismaAutomationRuleRepository } from "./repositories/PrismaAutomationRuleRepository";
export { PrismaWorkflowExecutionRepository } from "./repositories/PrismaWorkflowExecutionRepository";

// Engine
export { RuleEngine } from "./engines/RuleEngine";

// Services
export { AutomationRuleService } from "./services/AutomationRuleService";
export { WorkflowExecutionService } from "./services/WorkflowExecutionService";

// Container (singleton instances)
export { automationRuleService, workflowExecutionService } from "./container";
