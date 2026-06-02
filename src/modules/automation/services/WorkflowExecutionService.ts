// FILE: src/modules/automation/services/WorkflowExecutionService.ts
import { BaseService } from "@lib/baseService";
import { NotFoundError, ForbiddenError, BadRequestError } from "@errors/HttpError";
import type { PaginatedResult } from "@shared-types";
import { hotelService } from "@modules/hotel/container";
import type { PrismaAutomationRuleRepository } from "../repositories/PrismaAutomationRuleRepository";
import type { PrismaWorkflowExecutionRepository } from "../repositories/PrismaWorkflowExecutionRepository";
import type {
  WorkflowExecution,
  AutomationRule,
  ConditionPredicate,
  ExecutionFilter,
} from "../types";
import type {
  TriggerWorkflowDtoType,
  ExecutionFilterDtoType,
} from "../dto";
import { AUTOMATION_ERRORS, MAX_RETRY_COUNT } from "../constants";
import { RuleEngine } from "../engines/RuleEngine";

export class WorkflowExecutionService extends BaseService {
  protected readonly moduleName = "WorkflowExecutionService";

  constructor(
    private readonly ruleRepo: PrismaAutomationRuleRepository,
    private readonly executionRepo: PrismaWorkflowExecutionRepository
  ) {
    super();
  }

  async triggerRule(
    dto: TriggerWorkflowDtoType,
    _userId: string,
    orgId: string
  ): Promise<WorkflowExecution> {
    return this.execute("triggerRule", async () => {
      // 1. Find rule and validate org
      const rule = await this.requireRuleInOrg(dto.ruleId, orgId);

      // Must be ACTIVE
      if (rule.ruleStatus !== "ACTIVE") {
        throw new BadRequestError(AUTOMATION_ERRORS.RULE_INACTIVE);
      }

      // 2. Generate idempotency key
      const idempotencyKey = `rule:${dto.ruleId}:${Date.now()}`;

      // 3. Check idempotency — if already PENDING or RUNNING, return existing
      const existing = await this.executionRepo.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        if (existing.executionStatus === "PENDING" || existing.executionStatus === "RUNNING") {
          return existing;
        }
      }

      // 4. Create execution record (PENDING)
      const execution = await this.executionRepo.create({
        workflowName: rule.ruleName,
        automationRuleId: rule.id,
        triggerSource: "MANUAL",
        executionPayload: dto.payload ?? {},
        organizationId: orgId,
        hotelId: rule.hotelId,
        idempotencyKey,
      });

      // 5. Transition to RUNNING
      const running = await this.executionRepo.updateStatus(execution.id, "RUNNING", {
        startedAt: new Date(),
      });

      // 6. Evaluate rule conditions
      const context = dto.payload ?? {};
      const conditions = this.extractConditions(rule);
      const conditionsMet = RuleEngine.evaluate(conditions, context);

      // 7 & 8. Execute action or record skip
      if (conditionsMet) {
        const actionType = this.getActionType(rule);
        this.getLogger().info("Executing action", {
          ruleId: rule.id,
          actionType,
          executionId: running.id,
        });
        const completed = await this.executionRepo.updateStatus(running.id, "COMPLETED", {
          completedAt: new Date(),
          resultPayload: {
            actionExecuted: true,
            actionType,
          },
        });
        return completed;
      } else {
        const completed = await this.executionRepo.updateStatus(running.id, "COMPLETED", {
          completedAt: new Date(),
          resultPayload: {
            actionExecuted: false,
            reason: "Conditions not met",
          },
        });
        return completed;
      }
    });
  }

  async processEventTrigger(
    triggerType: string,
    context: Record<string, unknown>,
    orgId: string,
    hotelId?: string
  ): Promise<{ triggered: number }> {
    return this.execute("processEventTrigger", async () => {
      // 1. Find all active rules for this trigger type in this org
      const rules = await this.ruleRepo.findActiveByTrigger(triggerType, orgId);

      let triggered = 0;

      // 2. For each rule evaluate conditions and fire if matched
      for (const rule of rules) {
        if (hotelId && rule.hotelId !== hotelId) continue;

        try {
          const conditions = this.extractConditions(rule);
          const conditionsMet = RuleEngine.evaluate(conditions, context);

          // 3. Create + run execution (fire-and-forget per rule, wrapped in try/catch)
          const idempotencyKey = `event:${triggerType}:${rule.id}:${Date.now()}`;

          const execution = await this.executionRepo.create({
            workflowName: rule.ruleName,
            automationRuleId: rule.id,
            triggerSource: triggerType,
            executionPayload: context,
            organizationId: orgId,
            hotelId: rule.hotelId,
            idempotencyKey,
          });

          await this.executionRepo.updateStatus(execution.id, "RUNNING", {
            startedAt: new Date(),
          });

          if (conditionsMet) {
            const actionType = this.getActionType(rule);
            this.getLogger().info("Event trigger: executing action", {
              ruleId: rule.id,
              actionType,
              executionId: execution.id,
            });
            await this.executionRepo.updateStatus(execution.id, "COMPLETED", {
              completedAt: new Date(),
              resultPayload: {
                actionExecuted: true,
                actionType,
              },
            });
            triggered++;
          } else {
            await this.executionRepo.updateStatus(execution.id, "COMPLETED", {
              completedAt: new Date(),
              resultPayload: {
                actionExecuted: false,
                reason: "Conditions not met",
              },
            });
          }
        } catch (err) {
          this.getLogger().error(
            `processEventTrigger: rule ${rule.id} failed`,
            err instanceof Error ? err : undefined
          );
        }
      }

      return { triggered };
    });
  }

  async retryExecution(id: string, orgId: string): Promise<WorkflowExecution> {
    return this.execute("retryExecution", async () => {
      // 1. Find execution and validate org
      const execution = await this.executionRepo.findById(id);
      if (!execution) throw new NotFoundError(AUTOMATION_ERRORS.EXECUTION_NOT_FOUND);
      if (execution.organizationId !== orgId) {
        throw new ForbiddenError(AUTOMATION_ERRORS.EXECUTION_NOT_FOUND);
      }

      // 2. Must be FAILED; check retryCount
      if (execution.executionStatus !== "FAILED") {
        throw new BadRequestError("Only FAILED executions can be retried");
      }
      if (execution.retryCount >= MAX_RETRY_COUNT) {
        throw new BadRequestError(
          `Maximum retry count (${MAX_RETRY_COUNT}) reached`
        );
      }

      // 3. Increment retryCount, RETRYING → RUNNING
      const newRetryCount = execution.retryCount + 1;

      await this.executionRepo.updateStatus(id, "RETRYING", {
        retryCount: newRetryCount,
      });

      const running = await this.executionRepo.updateStatus(id, "RUNNING", {
        startedAt: new Date(),
      });

      // 4. Re-execute action
      try {
        if (execution.automationRuleId) {
          const rule = await this.ruleRepo.findById(execution.automationRuleId);
          if (rule) {
            const context = (execution.executionPayload ?? {}) as Record<string, unknown>;
            const conditions = this.extractConditions(rule);
            const conditionsMet = RuleEngine.evaluate(conditions, context);

            if (conditionsMet) {
              const actionType = this.getActionType(rule);
              this.getLogger().info("Retry: executing action", {
                ruleId: rule.id,
                actionType,
                executionId: running.id,
                retryCount: newRetryCount,
              });
              return await this.executionRepo.updateStatus(running.id, "COMPLETED", {
                completedAt: new Date(),
                resultPayload: {
                  actionExecuted: true,
                  actionType,
                  retried: true,
                },
              });
            } else {
              return await this.executionRepo.updateStatus(running.id, "COMPLETED", {
                completedAt: new Date(),
                resultPayload: {
                  actionExecuted: false,
                  reason: "Conditions not met",
                  retried: true,
                },
              });
            }
          }
        }

        // No rule attached — mark completed with no action
        return await this.executionRepo.updateStatus(running.id, "COMPLETED", {
          completedAt: new Date(),
          resultPayload: { actionExecuted: false, reason: "No rule attached", retried: true },
        });
      } catch (err) {
        const failureReason =
          err instanceof Error ? err.message : "Unknown retry failure";
        return await this.executionRepo.updateStatus(running.id, "FAILED", {
          completedAt: new Date(),
          failureReason,
          retryCount: newRetryCount,
        });
      }
    });
  }

  async listExecutions(
    filter: ExecutionFilterDtoType,
    orgId: string
  ): Promise<PaginatedResult<WorkflowExecution>> {
    return this.execute("listExecutions", async () => {
      // Validate hotel if hotelId provided
      if (filter.hotelId) {
        const hotelValid = await hotelService.validateOwnership(filter.hotelId, orgId);
        if (!hotelValid) throw new NotFoundError(AUTOMATION_ERRORS.HOTEL_NOT_FOUND);
      }

      const executionFilter: ExecutionFilter = {
        organizationId: orgId,
        hotelId: filter.hotelId,
        workflowName: filter.workflowName,
        executionStatus: filter.executionStatus,
        page: filter.page,
        limit: filter.limit,
      };

      return this.executionRepo.findManyFiltered(executionFilter);
    });
  }

  async getExecution(id: string, orgId: string): Promise<WorkflowExecution> {
    return this.execute("getExecution", async () => {
      const execution = await this.executionRepo.findById(id);
      if (!execution) throw new NotFoundError(AUTOMATION_ERRORS.EXECUTION_NOT_FOUND);
      if (execution.organizationId !== orgId) {
        throw new ForbiddenError(AUTOMATION_ERRORS.EXECUTION_NOT_FOUND);
      }
      return execution;
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private async requireRuleInOrg(id: string, orgId: string): Promise<AutomationRule> {
    const rule = await this.ruleRepo.findById(id);
    if (!rule) throw new NotFoundError(AUTOMATION_ERRORS.RULE_NOT_FOUND);
    if (rule.organizationId !== orgId) {
      throw new ForbiddenError(AUTOMATION_ERRORS.RULE_NOT_FOUND);
    }
    return rule;
  }

  /**
   * Extracts ConditionPredicate[] from the rule's conditionPayload.
   * The payload is stored as { conditions: ConditionPredicate[] } or directly as an array.
   */
  private extractConditions(rule: AutomationRule): ConditionPredicate[] {
    const payload = rule.conditionPayload;
    // Support both storage formats
    if (Array.isArray(payload)) {
      return payload as ConditionPredicate[];
    }
    const nested = (payload as Record<string, unknown>)["conditions"];
    if (Array.isArray(nested)) {
      return nested as ConditionPredicate[];
    }
    return [];
  }

  private getActionType(rule: AutomationRule): string {
    const type = (rule.actionPayload as Record<string, unknown>)["type"];
    return typeof type === "string" ? type : "UNKNOWN";
  }
}
