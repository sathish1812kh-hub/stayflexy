// FILE: src/modules/pricing/services/PricingRuleService.ts
import { BaseService } from "@lib/baseService";
import { prisma } from "@lib/prisma";
import { NotFoundError, ConflictError, ForbiddenError } from "@errors/HttpError";
import type { PaginatedResult } from "@shared-types";
import type { PrismaPricingRuleRepository } from "../repositories/PrismaPricingRuleRepository";
import type {
  PricingRule,
  CreatePricingRuleData,
  UpdatePricingRuleData,
  PricingRuleFilter,
} from "../types";
import type { CreatePricingRuleDtoType, UpdatePricingRuleDtoType, PricingRuleFilterDtoType } from "../dto";
import { PRICING_ERRORS } from "../constants";

export class PricingRuleService extends BaseService {
  protected readonly moduleName = "PricingRuleService";

  constructor(private readonly ruleRepo: PrismaPricingRuleRepository) {
    super();
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private async validateHotelOrgAccess(hotelId: string, orgId: string): Promise<void> {
    const hotel = await prisma.hotel.findFirst({
      where: { id: hotelId, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!hotel) throw new ForbiddenError(PRICING_ERRORS.HOTEL_NOT_FOUND);
  }

  private async validateRoomTypeBelongsToHotel(
    roomTypeId: string,
    hotelId: string
  ): Promise<void> {
    const roomType = await prisma.roomType.findFirst({
      where: { id: roomTypeId, hotelId, deletedAt: null },
      select: { id: true },
    });
    if (!roomType) throw new NotFoundError(PRICING_ERRORS.ROOM_TYPE_NOT_FOUND);
  }

  private async findRuleAndValidateOrg(id: string, orgId: string): Promise<PricingRule> {
    const rule = await this.ruleRepo.findById(id);
    if (!rule) throw new NotFoundError(PRICING_ERRORS.RULE_NOT_FOUND);
    if (rule.organizationId !== orgId) throw new ForbiddenError(PRICING_ERRORS.ACCESS_DENIED);
    return rule;
  }

  // ─── createRule ───────────────────────────────────────────────────────────────

  async createRule(
    dto: CreatePricingRuleDtoType,
    userId: string,
    orgId: string
  ): Promise<PricingRule> {
    return this.execute("createRule", async () => {
      // 1. Validate hotel org access
      await this.validateHotelOrgAccess(dto.hotelId, orgId);

      // 2. If roomTypeId: validate roomType belongs to hotel
      if (dto.roomTypeId) {
        await this.validateRoomTypeBelongsToHotel(dto.roomTypeId, dto.hotelId);
      }

      // 3. Validate price bounds
      if (
        dto.minimumPrice !== undefined &&
        dto.maximumPrice !== undefined &&
        dto.minimumPrice > dto.maximumPrice
      ) {
        throw new ConflictError(PRICING_ERRORS.INVALID_PRICE_BOUNDS);
      }

      // 4. Create rule with status=DRAFT
      const data: CreatePricingRuleData = {
        organizationId: orgId,
        hotelId: dto.hotelId,
        roomTypeId: dto.roomTypeId,
        ruleName: dto.ruleName,
        pricingStrategy: dto.pricingStrategy,
        adjustmentType: dto.adjustmentType,
        adjustmentValue: dto.adjustmentValue,
        minimumPrice: dto.minimumPrice,
        maximumPrice: dto.maximumPrice,
        applicableDays: dto.applicableDays,
        applicableSeasons: dto.applicableSeasons,
        activeFrom: new Date(dto.activeFrom),
        activeTo: dto.activeTo ? new Date(dto.activeTo) : undefined,
        priority: dto.priority,
        createdById: userId,
      };

      return this.ruleRepo.create(data);
    });
  }

  // ─── updateRule ───────────────────────────────────────────────────────────────

  async updateRule(
    id: string,
    dto: UpdatePricingRuleDtoType,
    userId: string,
    orgId: string
  ): Promise<PricingRule> {
    return this.execute("updateRule", async () => {
      // 1. Find rule and validate org
      await this.findRuleAndValidateOrg(id, orgId);

      // 2. Validate price bounds if both supplied
      if (
        dto.minimumPrice !== undefined &&
        dto.maximumPrice !== undefined &&
        dto.minimumPrice > dto.maximumPrice
      ) {
        throw new ConflictError(PRICING_ERRORS.INVALID_PRICE_BOUNDS);
      }

      // 3. Build update data
      const data: UpdatePricingRuleData = {};
      if (dto.ruleName !== undefined) data.ruleName = dto.ruleName;
      if (dto.adjustmentType !== undefined) data.adjustmentType = dto.adjustmentType;
      if (dto.adjustmentValue !== undefined) data.adjustmentValue = dto.adjustmentValue;
      if (dto.minimumPrice !== undefined) data.minimumPrice = dto.minimumPrice;
      if (dto.maximumPrice !== undefined) data.maximumPrice = dto.maximumPrice;
      if (dto.applicableDays !== undefined) data.applicableDays = dto.applicableDays;
      if (dto.applicableSeasons !== undefined) data.applicableSeasons = dto.applicableSeasons;
      if (dto.activeFrom !== undefined) data.activeFrom = new Date(dto.activeFrom);
      if (dto.activeTo !== undefined) data.activeTo = new Date(dto.activeTo);
      if (dto.priority !== undefined) data.priority = dto.priority;
      if (dto.status !== undefined) data.status = dto.status;

      return this.ruleRepo.update(id, data);
    });
  }

  // ─── activateRule ─────────────────────────────────────────────────────────────

  async activateRule(id: string, orgId: string): Promise<PricingRule> {
    return this.execute("activateRule", async () => {
      await this.findRuleAndValidateOrg(id, orgId);
      return this.ruleRepo.updateStatus(id, "ACTIVE");
    });
  }

  // ─── deactivateRule ───────────────────────────────────────────────────────────

  async deactivateRule(id: string, orgId: string): Promise<PricingRule> {
    return this.execute("deactivateRule", async () => {
      await this.findRuleAndValidateOrg(id, orgId);
      return this.ruleRepo.updateStatus(id, "INACTIVE");
    });
  }

  // ─── deleteRule ───────────────────────────────────────────────────────────────

  async deleteRule(id: string, orgId: string): Promise<PricingRule> {
    return this.execute("deleteRule", async () => {
      await this.findRuleAndValidateOrg(id, orgId);
      return this.ruleRepo.updateStatus(id, "ARCHIVED");
    });
  }

  // ─── getRule ──────────────────────────────────────────────────────────────────

  async getRule(id: string, orgId: string): Promise<PricingRule> {
    return this.execute("getRule", async () => {
      return this.findRuleAndValidateOrg(id, orgId);
    });
  }

  // ─── listRules ────────────────────────────────────────────────────────────────

  async listRules(
    filter: PricingRuleFilterDtoType,
    orgId: string
  ): Promise<PaginatedResult<PricingRule>> {
    return this.execute("listRules", async () => {
      // Validate hotel access
      await this.validateHotelOrgAccess(filter.hotelId, orgId);

      const pricingFilter: PricingRuleFilter = {
        organizationId: orgId,
        hotelId: filter.hotelId,
        roomTypeId: filter.roomTypeId,
        status: filter.status,
        pricingStrategy: filter.pricingStrategy,
        page: filter.page,
        limit: filter.limit,
      };

      return this.ruleRepo.findManyFiltered(pricingFilter);
    });
  }
}
