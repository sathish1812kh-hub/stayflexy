// FILE: src/modules/automation/repositories/PrismaAutomationRuleRepository.ts
import { type Prisma } from "@prisma/client";
import { BaseRepository } from "@lib/baseRepository";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type {
  AutomationRule,
  CreateAutomationRuleData,
  UpdateAutomationRuleData,
  RuleFilter,
  AutomationRuleStatusType,
  AutomationTriggerTypeType,
} from "../types";

type PrismaRule = Prisma.AutomationRuleGetPayload<Record<string, never>>;

function toRule(r: PrismaRule): AutomationRule {
  return {
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    ruleName: r.ruleName,
    triggerType: r.triggerType as AutomationTriggerTypeType,
    conditionPayload: r.conditionPayload as Record<string, unknown>,
    actionPayload: r.actionPayload as Record<string, unknown>,
    ruleStatus: r.ruleStatus as AutomationRuleStatusType,
    priority: r.priority,
    createdById: r.createdById,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaAutomationRuleRepository extends BaseRepository<
  AutomationRule,
  CreateAutomationRuleData,
  UpdateAutomationRuleData
> {
  async findById(id: string): Promise<Nullable<AutomationRule>> {
    const r = await this.db.automationRule.findFirst({ where: { id } });
    return r ? toRule(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<AutomationRule>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.automationRule.findMany({
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.automationRule.count(),
    ]);
    return {
      data: records.map(toRule),
      meta: this.buildPaginationMeta(total, params),
    };
  }

  async findManyFiltered(filter: RuleFilter): Promise<PaginatedResult<AutomationRule>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const params: PaginationParams = { page, limit };
    const skip = this.buildSkip(params);

    const where: Prisma.AutomationRuleWhereInput = {
      ...(filter.organizationId && { organizationId: filter.organizationId }),
      ...(filter.hotelId && { hotelId: filter.hotelId }),
      ...(filter.triggerType && {
        triggerType: filter.triggerType as PrismaRule["triggerType"],
      }),
      ...(filter.ruleStatus && {
        ruleStatus: filter.ruleStatus as PrismaRule["ruleStatus"],
      }),
    };

    const [records, total] = await Promise.all([
      this.db.automationRule.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      }),
      this.db.automationRule.count({ where }),
    ]);

    return {
      data: records.map(toRule),
      meta: this.buildPaginationMeta(total, params),
    };
  }

  async findActiveByTrigger(
    triggerType: string,
    organizationId?: string
  ): Promise<AutomationRule[]> {
    const records = await this.db.automationRule.findMany({
      where: {
        triggerType: triggerType as PrismaRule["triggerType"],
        ruleStatus: "ACTIVE",
        ...(organizationId && { organizationId }),
      },
      orderBy: { priority: "desc" },
    });
    return records.map(toRule);
  }

  async create(data: CreateAutomationRuleData): Promise<AutomationRule> {
    const r = await this.db.automationRule.create({
      data: {
        organizationId: data.organizationId,
        hotelId: data.hotelId,
        ruleName: data.ruleName,
        triggerType: data.triggerType as PrismaRule["triggerType"],
        conditionPayload: data.conditionPayload as Prisma.InputJsonValue,
        actionPayload: data.actionPayload as Prisma.InputJsonValue,
        ruleStatus: "DRAFT",
        priority: data.priority ?? 0,
        createdById: data.createdById,
      },
    });
    return toRule(r);
  }

  async update(id: string, data: UpdateAutomationRuleData): Promise<AutomationRule> {
    const payload: Prisma.AutomationRuleUpdateInput = {};
    if (data.ruleName !== undefined) payload.ruleName = data.ruleName;
    if (data.conditionPayload !== undefined)
      payload.conditionPayload = data.conditionPayload as Prisma.InputJsonValue;
    if (data.actionPayload !== undefined)
      payload.actionPayload = data.actionPayload as Prisma.InputJsonValue;
    if (data.ruleStatus !== undefined)
      payload.ruleStatus = data.ruleStatus as PrismaRule["ruleStatus"];
    if (data.priority !== undefined) payload.priority = data.priority;

    const r = await this.db.automationRule.update({ where: { id }, data: payload });
    return toRule(r);
  }

  async updateStatus(id: string, status: AutomationRuleStatusType): Promise<AutomationRule> {
    const r = await this.db.automationRule.update({
      where: { id },
      data: { ruleStatus: status as PrismaRule["ruleStatus"] },
    });
    return toRule(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.automationRule.delete({ where: { id } });
  }
}
