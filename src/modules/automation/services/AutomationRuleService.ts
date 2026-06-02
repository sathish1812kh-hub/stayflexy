// FILE: src/modules/automation/services/AutomationRuleService.ts
import { BaseService } from "@lib/baseService";
import { NotFoundError, ForbiddenError, BadRequestError } from "@errors/HttpError";
import type { PaginatedResult } from "@shared-types";
import { hotelService } from "@modules/hotel/container";
import type { PrismaAutomationRuleRepository } from "../repositories/PrismaAutomationRuleRepository";
import type {
  AutomationRule,
  CreateAutomationRuleData,
  RuleFilter,
  AutomationRuleStatusType,
} from "../types";
import type {
  CreateAutomationRuleDtoType,
  UpdateAutomationRuleDtoType,
  RuleFilterDtoType,
} from "../dto";
import { AUTOMATION_ERRORS } from "../constants";
import { RuleEngine } from "../engines/RuleEngine";

export class AutomationRuleService extends BaseService {
  protected readonly moduleName = "AutomationRuleService";

  constructor(private readonly ruleRepo: PrismaAutomationRuleRepository) {
    super();
  }

  async createRule(
    dto: CreateAutomationRuleDtoType,
    userId: string,
    orgId: string
  ): Promise<AutomationRule> {
    return this.execute("createRule", async () => {
      // Validate hotel belongs to org
      const hotelValid = await hotelService.validateOwnership(dto.hotelId, orgId);
      if (!hotelValid) throw new NotFoundError(AUTOMATION_ERRORS.HOTEL_NOT_FOUND);

      // Validate conditions are structurally valid
      if (!RuleEngine.validateConditions(dto.conditionPayload)) {
        throw new BadRequestError("Invalid conditionPayload structure");
      }

      const data: CreateAutomationRuleData = {
        organizationId: orgId,
        hotelId: dto.hotelId,
        ruleName: dto.ruleName,
        triggerType: dto.triggerType,
        conditionPayload: { conditions: dto.conditionPayload },
        actionPayload: dto.actionPayload as Record<string, unknown>,
        priority: dto.priority,
        createdById: userId,
      };

      const rule = await this.ruleRepo.create(data);
      this.getLogger().info("Automation rule created", {
        ruleId: rule.id,
        orgId,
        hotelId: dto.hotelId,
      });
      return rule;
    });
  }

  async updateRule(
    id: string,
    dto: UpdateAutomationRuleDtoType,
    orgId: string
  ): Promise<AutomationRule> {
    return this.execute("updateRule", async () => {
      const rule = await this.requireRuleInOrg(id, orgId);

      if (dto.conditionPayload !== undefined) {
        if (!RuleEngine.validateConditions(dto.conditionPayload)) {
          throw new BadRequestError("Invalid conditionPayload structure");
        }
      }

      const updated = await this.ruleRepo.update(rule.id, {
        ruleName: dto.ruleName,
        conditionPayload:
          dto.conditionPayload !== undefined
            ? { conditions: dto.conditionPayload }
            : undefined,
        actionPayload:
          dto.actionPayload !== undefined
            ? (dto.actionPayload as Record<string, unknown>)
            : undefined,
        ruleStatus: dto.ruleStatus,
        priority: dto.priority,
      });

      this.getLogger().info("Automation rule updated", { ruleId: id });
      return updated;
    });
  }

  async activateRule(id: string, orgId: string): Promise<AutomationRule> {
    return this.execute("activateRule", async () => {
      await this.requireRuleInOrg(id, orgId);
      const updated = await this.ruleRepo.updateStatus(id, "ACTIVE");
      this.getLogger().info("Automation rule activated", { ruleId: id });
      return updated;
    });
  }

  async deactivateRule(id: string, orgId: string): Promise<AutomationRule> {
    return this.execute("deactivateRule", async () => {
      await this.requireRuleInOrg(id, orgId);
      const updated = await this.ruleRepo.updateStatus(id, "INACTIVE");
      this.getLogger().info("Automation rule deactivated", { ruleId: id });
      return updated;
    });
  }

  async deleteRule(id: string, orgId: string): Promise<void> {
    return this.execute("deleteRule", async () => {
      await this.requireRuleInOrg(id, orgId);
      await this.ruleRepo.hardDelete(id);
      this.getLogger().info("Automation rule deleted", { ruleId: id });
    });
  }

  async getRule(id: string, orgId: string): Promise<AutomationRule> {
    return this.execute("getRule", async () => {
      return this.requireRuleInOrg(id, orgId);
    });
  }

  async listRules(
    filter: RuleFilterDtoType,
    orgId: string
  ): Promise<PaginatedResult<AutomationRule>> {
    return this.execute("listRules", async () => {
      // Validate hotel belongs to org
      const hotelValid = await hotelService.validateOwnership(filter.hotelId, orgId);
      if (!hotelValid) throw new NotFoundError(AUTOMATION_ERRORS.HOTEL_NOT_FOUND);

      const ruleFilter: RuleFilter = {
        organizationId: orgId,
        hotelId: filter.hotelId,
        triggerType: filter.triggerType,
        ruleStatus: filter.ruleStatus as AutomationRuleStatusType | undefined,
        page: filter.page,
        limit: filter.limit,
      };

      return this.ruleRepo.findManyFiltered(ruleFilter);
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
}
