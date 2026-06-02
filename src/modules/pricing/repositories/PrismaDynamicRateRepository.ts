// FILE: src/modules/pricing/repositories/PrismaDynamicRateRepository.ts
import { type Prisma } from "@prisma/client";
import { BaseRepository } from "@lib/baseRepository";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type {
  DynamicRate,
  CreateDynamicRateData,
  UpdateDynamicRateData,
} from "../types";

type PrismaDynamicRateRecord = Prisma.DynamicRateGetPayload<Record<string, never>>;

function toRate(r: PrismaDynamicRateRecord): DynamicRate {
  return {
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    roomTypeId: r.roomTypeId,
    inventoryDate: r.inventoryDate,
    calculatedRate: r.calculatedRate.toNumber(),
    baseRate: r.baseRate.toNumber(),
    appliedRuleId: r.appliedRuleId ?? null,
    occupancyFactor: r.occupancyFactor.toNumber(),
    demandFactor: r.demandFactor.toNumber(),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaDynamicRateRepository extends BaseRepository<
  DynamicRate,
  CreateDynamicRateData,
  UpdateDynamicRateData
> {
  async findById(id: string): Promise<Nullable<DynamicRate>> {
    const r = await this.db.dynamicRate.findFirst({
      where: { id },
    });
    return r ? toRate(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<DynamicRate>> {
    const skip = this.buildSkip(params);
    const where: Prisma.DynamicRateWhereInput = {};
    const [records, total] = await Promise.all([
      this.db.dynamicRate.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { inventoryDate: "asc" },
      }),
      this.db.dynamicRate.count({ where }),
    ]);
    return { data: records.map(toRate), meta: this.buildPaginationMeta(total, params) };
  }

  async findByRoomTypeAndDate(
    roomTypeId: string,
    date: Date
  ): Promise<Nullable<DynamicRate>> {
    const r = await this.db.dynamicRate.findFirst({
      where: { roomTypeId, inventoryDate: date },
    });
    return r ? toRate(r) : null;
  }

  async findByHotelAndDateRange(
    hotelId: string,
    startDate: Date,
    endDate: Date,
    roomTypeId?: string
  ): Promise<DynamicRate[]> {
    const where: Prisma.DynamicRateWhereInput = {
      hotelId,
      inventoryDate: { gte: startDate, lte: endDate },
      ...(roomTypeId !== undefined && { roomTypeId }),
    };

    const records = await this.db.dynamicRate.findMany({
      where,
      orderBy: [{ roomTypeId: "asc" }, { inventoryDate: "asc" }],
    });
    return records.map(toRate);
  }

  async upsertRate(data: CreateDynamicRateData): Promise<DynamicRate> {
    const r = await this.db.dynamicRate.upsert({
      where: {
        roomTypeId_inventoryDate: {
          roomTypeId: data.roomTypeId,
          inventoryDate: data.inventoryDate,
        },
      },
      create: {
        organizationId: data.organizationId,
        hotelId: data.hotelId,
        roomTypeId: data.roomTypeId,
        inventoryDate: data.inventoryDate,
        calculatedRate: data.calculatedRate,
        baseRate: data.baseRate,
        appliedRuleId: data.appliedRuleId ?? null,
        occupancyFactor: data.occupancyFactor ?? 1.0,
        demandFactor: data.demandFactor ?? 1.0,
      },
      update: {
        calculatedRate: data.calculatedRate,
        baseRate: data.baseRate,
        appliedRuleId: data.appliedRuleId ?? null,
        occupancyFactor: data.occupancyFactor ?? 1.0,
        demandFactor: data.demandFactor ?? 1.0,
      },
    });
    return toRate(r);
  }

  async create(data: CreateDynamicRateData): Promise<DynamicRate> {
    const r = await this.db.dynamicRate.create({
      data: {
        organizationId: data.organizationId,
        hotelId: data.hotelId,
        roomTypeId: data.roomTypeId,
        inventoryDate: data.inventoryDate,
        calculatedRate: data.calculatedRate,
        baseRate: data.baseRate,
        appliedRuleId: data.appliedRuleId ?? null,
        occupancyFactor: data.occupancyFactor ?? 1.0,
        demandFactor: data.demandFactor ?? 1.0,
      },
    });
    return toRate(r);
  }

  async update(id: string, data: UpdateDynamicRateData): Promise<DynamicRate> {
    const payload: Prisma.DynamicRateUncheckedUpdateInput = {};

    if (data.calculatedRate !== undefined) payload.calculatedRate = data.calculatedRate;
    if (data.appliedRuleId !== undefined) payload.appliedRuleId = data.appliedRuleId;
    if (data.occupancyFactor !== undefined) payload.occupancyFactor = data.occupancyFactor;
    if (data.demandFactor !== undefined) payload.demandFactor = data.demandFactor;

    const r = await this.db.dynamicRate.update({ where: { id }, data: payload });
    return toRate(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.dynamicRate.delete({ where: { id } });
  }
}
