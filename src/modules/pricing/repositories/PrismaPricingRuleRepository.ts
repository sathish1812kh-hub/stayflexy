// FILE: src/modules/pricing/repositories/PrismaPricingRuleRepository.ts
import { type Prisma } from "@prisma/client";
import { BaseRepository } from "@lib/baseRepository";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type {
  PricingRule,
  CreatePricingRuleData,
  UpdatePricingRuleData,
  PricingRuleFilter,
  PricingRuleStatusType,
  PricingStrategyType,
  AdjustmentTypeType,
} from "../types";

type PrismaPricingRuleRecord = Prisma.PricingRuleGetPayload<Record<string, never>>;

function toRule(r: PrismaPricingRuleRecord): PricingRule {
  return {
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    roomTypeId: r.roomTypeId ?? null,
    ruleName: r.ruleName,
    pricingStrategy: r.pricingStrategy as PricingStrategyType,
    adjustmentType: r.adjustmentType as AdjustmentTypeType,
    adjustmentValue: r.adjustmentValue.toNumber(),
    minimumPrice: r.minimumPrice !== null ? r.minimumPrice.toNumber() : null,
    maximumPrice: r.maximumPrice !== null ? r.maximumPrice.toNumber() : null,
    applicableDays: r.applicableDays,
    applicableSeasons: r.applicableSeasons,
    activeFrom: r.activeFrom,
    activeTo: r.activeTo ?? null,
    priority: r.priority,
    status: r.status as PricingRuleStatusType,
    createdById: r.createdById,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaPricingRuleRepository extends BaseRepository<
  PricingRule,
  CreatePricingRuleData,
  UpdatePricingRuleData
> {
  async findById(id: string): Promise<Nullable<PricingRule>> {
    const r = await this.db.pricingRule.findFirst({
      where: { id },
    });
    return r ? toRule(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<PricingRule>> {
    const skip = this.buildSkip(params);
    const where: Prisma.PricingRuleWhereInput = {};
    const [records, total] = await Promise.all([
      this.db.pricingRule.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.pricingRule.count({ where }),
    ]);
    return { data: records.map(toRule), meta: this.buildPaginationMeta(total, params) };
  }

  async findManyFiltered(filter: PricingRuleFilter): Promise<PaginatedResult<PricingRule>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const params: PaginationParams = { page, limit };
    const skip = this.buildSkip(params);

    const where: Prisma.PricingRuleWhereInput = {
      ...(filter.organizationId !== undefined && { organizationId: filter.organizationId }),
      ...(filter.hotelId !== undefined && { hotelId: filter.hotelId }),
      ...(filter.roomTypeId !== undefined && { roomTypeId: filter.roomTypeId }),
      ...(filter.status !== undefined && { status: filter.status as PrismaPricingRuleRecord["status"] }),
      ...(filter.pricingStrategy !== undefined && {
        pricingStrategy: filter.pricingStrategy as PrismaPricingRuleRecord["pricingStrategy"],
      }),
    };

    const [records, total] = await Promise.all([
      this.db.pricingRule.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      }),
      this.db.pricingRule.count({ where }),
    ]);
    return { data: records.map(toRule), meta: this.buildPaginationMeta(total, params) };
  }

  async findActiveRulesForDate(
    hotelId: string,
    roomTypeId: string | null,
    date: Date
  ): Promise<PricingRule[]> {
    const where: Prisma.PricingRuleWhereInput = {
      hotelId,
      status: "ACTIVE",
      activeFrom: { lte: date },
      OR: [{ activeTo: null }, { activeTo: { gte: date } }],
      ...(roomTypeId !== null ? { roomTypeId } : { roomTypeId: null }),
    };

    const records = await this.db.pricingRule.findMany({
      where,
      orderBy: { priority: "desc" },
    });
    return records.map(toRule);
  }

  async create(data: CreatePricingRuleData): Promise<PricingRule> {
    const r = await this.db.pricingRule.create({
      data: {
        organizationId: data.organizationId,
        hotelId: data.hotelId,
        roomTypeId: data.roomTypeId ?? null,
        ruleName: data.ruleName,
        pricingStrategy: data.pricingStrategy as PrismaPricingRuleRecord["pricingStrategy"],
        adjustmentType: data.adjustmentType as PrismaPricingRuleRecord["adjustmentType"],
        adjustmentValue: data.adjustmentValue,
        minimumPrice: data.minimumPrice ?? null,
        maximumPrice: data.maximumPrice ?? null,
        applicableDays: data.applicableDays,
        applicableSeasons: data.applicableSeasons,
        activeFrom: data.activeFrom,
        activeTo: data.activeTo ?? null,
        priority: data.priority ?? 0,
        status: "DRAFT",
        createdById: data.createdById,
      },
    });
    return toRule(r);
  }

  async update(id: string, data: UpdatePricingRuleData): Promise<PricingRule> {
    const payload: Prisma.PricingRuleUpdateInput = {};

    if (data.ruleName !== undefined) payload.ruleName = data.ruleName;
    if (data.adjustmentType !== undefined)
      payload.adjustmentType = data.adjustmentType as PrismaPricingRuleRecord["adjustmentType"];
    if (data.adjustmentValue !== undefined) payload.adjustmentValue = data.adjustmentValue;
    if (data.minimumPrice !== undefined) payload.minimumPrice = data.minimumPrice;
    if (data.maximumPrice !== undefined) payload.maximumPrice = data.maximumPrice;
    if (data.applicableDays !== undefined) payload.applicableDays = data.applicableDays;
    if (data.applicableSeasons !== undefined) payload.applicableSeasons = data.applicableSeasons;
    if (data.activeFrom !== undefined) payload.activeFrom = data.activeFrom;
    if (data.activeTo !== undefined) payload.activeTo = data.activeTo;
    if (data.priority !== undefined) payload.priority = data.priority;
    if (data.status !== undefined)
      payload.status = data.status as PrismaPricingRuleRecord["status"];

    const r = await this.db.pricingRule.update({ where: { id }, data: payload });
    return toRule(r);
  }

  async updateStatus(id: string, status: PricingRuleStatusType): Promise<PricingRule> {
    const r = await this.db.pricingRule.update({
      where: { id },
      data: { status: status as PrismaPricingRuleRecord["status"] },
    });
    return toRule(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.pricingRule.delete({ where: { id } });
  }
}
