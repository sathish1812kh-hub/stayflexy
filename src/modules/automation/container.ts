// FILE: src/modules/automation/container.ts
import { PrismaAutomationRuleRepository } from "./repositories/PrismaAutomationRuleRepository";
import { PrismaWorkflowExecutionRepository } from "./repositories/PrismaWorkflowExecutionRepository";
import { AutomationRuleService } from "./services/AutomationRuleService";
import { WorkflowExecutionService } from "./services/WorkflowExecutionService";

const ruleRepo = new PrismaAutomationRuleRepository();
const executionRepo = new PrismaWorkflowExecutionRepository();

export const automationRuleService = new AutomationRuleService(ruleRepo);
export const workflowExecutionService = new WorkflowExecutionService(ruleRepo, executionRepo);
