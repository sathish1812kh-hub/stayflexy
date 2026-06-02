// FILE: src/modules/workflow-engine/constants/index.ts
import type { WorkflowDefinition } from "../types";

export const BUILT_IN_WORKFLOWS: Record<string, WorkflowDefinition> = {
  LOW_OCCUPANCY_ALERT: {
    name: "LOW_OCCUPANCY_ALERT",
    version: 1,
    description: "Sends alert when hotel occupancy drops below threshold",
    triggerType: "OCCUPANCY_THRESHOLD",
    steps: [
      {
        name: "evaluate_occupancy",
        action: "LOG_INSIGHT",
        params: { insightType: "OCCUPANCY_TREND" },
        retryable: true,
      },
      {
        name: "notify_manager",
        action: "SEND_NOTIFICATION",
        params: { type: "IN_APP" },
        retryable: true,
      },
    ],
  },
  OTA_SYNC_FAILURE_ESCALATION: {
    name: "OTA_SYNC_FAILURE_ESCALATION",
    version: 1,
    description: "Escalates OTA sync failures to operations manager",
    triggerType: "OTA_SYNC_FAILED",
    steps: [
      {
        name: "log_failure",
        action: "LOG_INSIGHT",
        params: { insightType: "OPERATIONAL_BOTTLENECK" },
        retryable: false,
      },
      {
        name: "escalate",
        action: "ESCALATE_ALERT",
        params: { severity: "HIGH" },
        retryable: true,
      },
    ],
  },
  HOUSEKEEPING_WORKLOAD_BALANCE: {
    name: "HOUSEKEEPING_WORKLOAD_BALANCE",
    version: 1,
    description: "Balances housekeeping task assignments after checkout",
    triggerType: "HOUSEKEEPING_COMPLETED",
    steps: [
      {
        name: "analyze_workload",
        action: "LOG_INSIGHT",
        params: { insightType: "STAFF_WORKLOAD" },
        retryable: true,
      },
    ],
  },
} as const;
