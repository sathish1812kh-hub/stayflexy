// FILE: src/modules/automation/constants/index.ts

export const AUTOMATION_ERRORS = {
  RULE_NOT_FOUND: "Automation rule not found",
  EXECUTION_NOT_FOUND: "Workflow execution not found",
  HOTEL_NOT_FOUND: "Hotel not found or access denied",
  RULE_CONFLICT: "An active rule with this name already exists",
  IDEMPOTENCY_CONFLICT: "A workflow execution with this idempotency key already exists",
  RULE_INACTIVE: "Cannot execute an inactive or draft rule",
} as const;

export const ACTION_TYPES = {
  SEND_NOTIFICATION: "SEND_NOTIFICATION",
  UPDATE_ROOM_STATUS: "UPDATE_ROOM_STATUS",
  CREATE_HOUSEKEEPING_TASK: "CREATE_HOUSEKEEPING_TASK",
  ESCALATE_ALERT: "ESCALATE_ALERT",
  TRIGGER_OTA_SYNC: "TRIGGER_OTA_SYNC",
  LOG_INSIGHT: "LOG_INSIGHT",
} as const;

export const MAX_RETRY_COUNT = 3;
