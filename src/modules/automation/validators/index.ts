// FILE: src/modules/automation/validators/index.ts
import { ZodError } from "zod";
import { ValidationError } from "@errors/HttpError";
import {
  CreateAutomationRuleDto,
  UpdateAutomationRuleDto,
  RuleFilterDto,
  ExecutionFilterDto,
  TriggerWorkflowDto,
} from "../dto";
import type {
  CreateAutomationRuleDtoType,
  UpdateAutomationRuleDtoType,
  RuleFilterDtoType,
  ExecutionFilterDtoType,
  TriggerWorkflowDtoType,
} from "../dto";

function wrapZod<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      throw new ValidationError("Validation failed", details);
    }
    throw error;
  }
}

export function validateCreateAutomationRule(data: unknown): CreateAutomationRuleDtoType {
  return wrapZod(() => CreateAutomationRuleDto.parse(data));
}

export function validateUpdateAutomationRule(data: unknown): UpdateAutomationRuleDtoType {
  return wrapZod(() => UpdateAutomationRuleDto.parse(data));
}

export function validateRuleFilter(data: unknown): RuleFilterDtoType {
  return wrapZod(() => RuleFilterDto.parse(data));
}

export function validateExecutionFilter(data: unknown): ExecutionFilterDtoType {
  return wrapZod(() => ExecutionFilterDto.parse(data));
}

export function validateTriggerWorkflow(data: unknown): TriggerWorkflowDtoType {
  return wrapZod(() => TriggerWorkflowDto.parse(data));
}
