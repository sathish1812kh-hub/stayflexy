// FILE: src/modules/workflow-engine/index.ts

// Types
export type {
  WorkflowStep,
  WorkflowDefinition,
  WorkflowTriggerContext,
} from "./types";

// Constants
export { BUILT_IN_WORKFLOWS } from "./constants";

// Services
export { WorkflowEngineService } from "./services/WorkflowEngineService";

// Container (singleton instance)
export { workflowEngineService } from "./container";
