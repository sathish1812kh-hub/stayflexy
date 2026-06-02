// FILE: src/modules/workflow-engine/services/WorkflowEngineService.ts
import { BaseService } from "@lib/baseService";
import { workflowExecutionService } from "@modules/automation/container";
import type { WorkflowDefinition, WorkflowTriggerContext } from "../types";
import { BUILT_IN_WORKFLOWS } from "../constants";

export class WorkflowEngineService extends BaseService {
  protected readonly moduleName = "WorkflowEngineService";

  /**
   * Routes a domain event to the automation trigger processor.
   * Returns the number of executions that were fired.
   */
  async handleEvent(
    ctx: WorkflowTriggerContext
  ): Promise<{ triggered: number }> {
    return this.execute("handleEvent", async () => {
      this.getLogger().info("Handling workflow event", {
        eventType: ctx.eventType,
        orgId: ctx.organizationId,
        hotelId: ctx.hotelId,
        correlationId: ctx.correlationId,
      });

      const result = await workflowExecutionService.processEventTrigger(
        ctx.eventType,
        ctx.payload,
        ctx.organizationId,
        ctx.hotelId
      );

      this.getLogger().info("Workflow event handled", {
        eventType: ctx.eventType,
        triggered: result.triggered,
      });

      return result;
    });
  }

  /**
   * Returns the list of all built-in workflow definitions.
   */
  listDefinitions(): WorkflowDefinition[] {
    return Object.values(BUILT_IN_WORKFLOWS);
  }

  /**
   * Returns a specific built-in workflow definition by name, or null if not found.
   */
  getDefinition(name: string): WorkflowDefinition | null {
    const definition = BUILT_IN_WORKFLOWS[name];
    return definition ?? null;
  }
}
