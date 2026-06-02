// FILE: src/modules/automation/dto/index.ts
import { z } from "zod";

const TRIGGER_TYPES = [
  "BOOKING_CREATED",
  "BOOKING_CANCELLED",
  "PAYMENT_COMPLETED",
  "PAYMENT_FAILED",
  "INVENTORY_LOW",
  "OCCUPANCY_THRESHOLD",
  "OTA_SYNC_FAILED",
  "HOUSEKEEPING_COMPLETED",
  "MAINTENANCE_OPENED",
  "SCHEDULED",
  "MANUAL",
] as const;

const EXECUTION_STATUSES = [
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "RETRYING",
  "CANCELLED",
  "AWAITING_APPROVAL",
] as const;

const RULE_STATUSES = ["ACTIVE", "INACTIVE", "DRAFT"] as const;

const ConditionPredicateSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(["eq", "gt", "lt", "gte", "lte", "contains", "in"]),
  value: z.unknown(),
});

export const CreateAutomationRuleDto = z.object({
  hotelId: z.string().uuid(),
  ruleName: z.string().min(2).max(200),
  triggerType: z.enum(TRIGGER_TYPES),
  conditionPayload: z.array(ConditionPredicateSchema).min(0),
  actionPayload: z.object({
    type: z.string().min(1),
    params: z.record(z.string(), z.unknown()),
  }),
  priority: z.number().int().default(0),
});

export const UpdateAutomationRuleDto = z.object({
  ruleName: z.string().min(2).max(200).optional(),
  conditionPayload: z.array(ConditionPredicateSchema).optional(),
  actionPayload: z
    .object({
      type: z.string().min(1),
      params: z.record(z.string(), z.unknown()),
    })
    .optional(),
  ruleStatus: z.enum(RULE_STATUSES).optional(),
  priority: z.number().int().optional(),
});

export const RuleFilterDto = z.object({
  hotelId: z.string().uuid(),
  triggerType: z.enum(TRIGGER_TYPES).optional(),
  ruleStatus: z.enum(RULE_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const ExecutionFilterDto = z.object({
  hotelId: z.string().uuid().optional(),
  workflowName: z.string().optional(),
  executionStatus: z.enum(EXECUTION_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const TriggerWorkflowDto = z.object({
  ruleId: z.string().uuid(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export type CreateAutomationRuleDtoType = z.infer<typeof CreateAutomationRuleDto>;
export type UpdateAutomationRuleDtoType = z.infer<typeof UpdateAutomationRuleDto>;
export type RuleFilterDtoType = z.infer<typeof RuleFilterDto>;
export type ExecutionFilterDtoType = z.infer<typeof ExecutionFilterDto>;
export type TriggerWorkflowDtoType = z.infer<typeof TriggerWorkflowDto>;
