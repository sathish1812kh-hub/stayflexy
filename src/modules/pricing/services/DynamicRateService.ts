// FILE: src/modules/pricing/services/DynamicRateService.ts
import { BaseService } from "@lib/baseService";
import { prisma } from "@lib/prisma";
import { ForbiddenError, NotFoundError } from "@errors/HttpError";
import { BookingRoomStatus } from "@prisma/client";
import type { PrismaPricingRuleRepository } from "../repositories/PrismaPricingRuleRepository";
import type { PrismaDynamicRateRepository } from "../repositories/PrismaDynamicRateRepository";
import type {
  DynamicRate,
  RateCalculationInput,
  RateCalculationResult,
  CreateDynamicRateData,
} from "../types";
import type { CalculateRateDtoType } from "../dto";
import { PRICING_ERRORS } from "../constants";
import { PricingCalculator } from "../calculators/PricingCalculator";

export class DynamicRateService extends BaseService {
  protected readonly moduleName = "DynamicRateService";

  constructor(
    private readonly ruleRepo: PrismaPricingRuleRepository,
    private readonly rateRepo: PrismaDynamicRateRepository
  ) {
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

  private async getOccupancyRate(
    roomTypeId: string,
    hotelId: string,
    date: Date
  ): Promise<number> {
    // Count booked rooms for the date
    const [bookedCount, totalCount] = await Promise.all([
      prisma.bookingRoom.count({
        where: {
          roomTypeId,
          checkInDate: { lte: date },
          checkOutDate: { gt: date },
          status: { notIn: [BookingRoomStatus.CANCELLED] },
        },
      }),
      prisma.room.count({
        where: { roomTypeId, hotelId, deletedAt: null },
      }),
    ]);

    if (totalCount === 0) return 0;
    return (bookedCount / totalCount) * 100;
  }

  private async fetchAllActiveRules(
    hotelId: string,
    roomTypeId: string,
    date: Date
  ) {
    // Fetch room-type-specific rules + hotel-level rules (roomTypeId=null)
    const [roomTypeRules, hotelLevelRules] = await Promise.all([
      this.ruleRepo.findActiveRulesForDate(hotelId, roomTypeId, date),
      this.ruleRepo.findActiveRulesForDate(hotelId, null, date),
    ]);
    return [...roomTypeRules, ...hotelLevelRules];
  }

  // ─── calculateAndStoreRate ────────────────────────────────────────────────────

  async calculateAndStoreRate(
    input: RateCalculationInput,
    orgId: string
  ): Promise<DynamicRate> {
    return this.execute("calculateAndStoreRate", async () => {
      // 1. Fetch active rules for this room type + hotel-level rules
      const allRules = await this.fetchAllActiveRules(
        input.hotelId,
        input.roomTypeId,
        input.date
      );

      // 2. Run calculator
      const result = PricingCalculator.calculateRate(input, allRules);

      // 3. Upsert DynamicRate
      const upsertData: CreateDynamicRateData = {
        organizationId: orgId,
        hotelId: input.hotelId,
        roomTypeId: input.roomTypeId,
        inventoryDate: input.date,
        calculatedRate: result.calculatedRate,
        baseRate: result.baseRate,
        appliedRuleId: result.appliedRuleId ?? undefined,
        occupancyFactor: result.occupancyFactor,
        demandFactor: result.demandFactor,
      };

      return this.rateRepo.upsertRate(upsertData);
    });
  }

  // ─── calculateRatePreview ─────────────────────────────────────────────────────

  async calculateRatePreview(
    dto: CalculateRateDtoType,
    orgId: string
  ): Promise<RateCalculationResult> {
    return this.execute("calculateRatePreview", async () => {
      // 1. Validate hotel org access
      await this.validateHotelOrgAccess(dto.hotelId, orgId);

      // 2. Resolve base rate
      let baseRate = dto.baseRate;
      if (baseRate === undefined) {
        const roomType = await prisma.roomType.findFirst({
          where: { id: dto.roomTypeId, deletedAt: null },
          select: { basePrice: true },
        });
        if (!roomType) throw new NotFoundError(PRICING_ERRORS.ROOM_TYPE_NOT_FOUND);
        baseRate = roomType.basePrice.toNumber();
      }

      // 3. Parse date
      const date = new Date(dto.date);

      // 4. Get occupancy for the date
      const occupancyRate = await this.getOccupancyRate(dto.roomTypeId, dto.hotelId, date);

      // 5. Fetch active rules
      const allRules = await this.fetchAllActiveRules(dto.hotelId, dto.roomTypeId, date);

      // 6. Run calculator and return WITHOUT storing
      const input: RateCalculationInput = {
        roomTypeId: dto.roomTypeId,
        hotelId: dto.hotelId,
        date,
        baseRate,
        occupancyRate,
      };

      return PricingCalculator.calculateRate(input, allRules);
    });
  }

  // ─── getRatesForHotel ─────────────────────────────────────────────────────────

  async getRatesForHotel(
    hotelId: string,
    startDate: Date,
    endDate: Date,
    orgId: string,
    roomTypeId?: string
  ): Promise<DynamicRate[]> {
    return this.execute("getRatesForHotel", async () => {
      // Validate hotel access
      await this.validateHotelOrgAccess(hotelId, orgId);
      return this.rateRepo.findByHotelAndDateRange(hotelId, startDate, endDate, roomTypeId);
    });
  }
}
