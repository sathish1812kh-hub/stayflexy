// FILE: src/modules/revenue/repositories/PrismaRevenueMetricRepository.ts
import { type Prisma } from "@prisma/client";
import { BaseRepository } from "@lib/baseRepository";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type {
  RevenueMetric,
  CreateRevenueMetricData,
  UpdateRevenueMetricData,
  RevenueMetricFilter,
} from "../types";

type PrismaRevenueMetricRecord = Prisma.RevenueMetricGetPayload<Record<string, never>>;

function toRevenueMetric(r: PrismaRevenueMetricRecord): RevenueMetric {
  return {
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    metricDate: r.metricDate,
    occupancyRate: r.occupancyRate.toNumber(),
    adr: r.adr.toNumber(),
    revpar: r.revpar.toNumber(),
    totalRevenue: r.totalRevenue.toNumber(),
    bookingCount: r.bookingCount,
    cancellationRate: r.cancellationRate.toNumber(),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaRevenueMetricRepository extends BaseRepository<
  RevenueMetric,
  CreateRevenueMetricData,
  UpdateRevenueMetricData
> {
  async findById(id: string): Promise<Nullable<RevenueMetric>> {
    const r = await this.db.revenueMetric.findFirst({ where: { id } });
    return r ? toRevenueMetric(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<RevenueMetric>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.revenueMetric.findMany({
        skip,
        take: params.limit,
        orderBy: { metricDate: "desc" },
      }),
      this.db.revenueMetric.count(),
    ]);
    return {
      data: records.map(toRevenueMetric),
      meta: this.buildPaginationMeta(total, params),
    };
  }

  async findByHotelAndDate(hotelId: string, date: Date): Promise<Nullable<RevenueMetric>> {
    const r = await this.db.revenueMetric.findFirst({
      where: { hotelId, metricDate: date },
    });
    return r ? toRevenueMetric(r) : null;
  }

  async findManyFiltered(
    filter: RevenueMetricFilter
  ): Promise<PaginatedResult<RevenueMetric>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 30;
    const skip = (page - 1) * limit;

    const where: Prisma.RevenueMetricWhereInput = {
      ...(filter.organizationId && { organizationId: filter.organizationId }),
      ...(filter.hotelId && { hotelId: filter.hotelId }),
      ...(filter.startDate || filter.endDate
        ? {
            metricDate: {
              ...(filter.startDate ? { gte: filter.startDate } : {}),
              ...(filter.endDate ? { lte: filter.endDate } : {}),
            },
          }
        : {}),
    };

    const [records, total] = await Promise.all([
      this.db.revenueMetric.findMany({
        where,
        skip,
        take: limit,
        orderBy: { metricDate: "desc" },
      }),
      this.db.revenueMetric.count({ where }),
    ]);

    return {
      data: records.map(toRevenueMetric),
      meta: this.buildPaginationMeta(total, { page, limit }),
    };
  }

  async upsertMetric(data: CreateRevenueMetricData): Promise<RevenueMetric> {
    const r = await this.db.revenueMetric.upsert({
      where: {
        hotelId_metricDate: {
          hotelId: data.hotelId,
          metricDate: data.metricDate,
        },
      },
      create: {
        organizationId: data.organizationId,
        hotelId: data.hotelId,
        metricDate: data.metricDate,
        occupancyRate: data.occupancyRate,
        adr: data.adr,
        revpar: data.revpar,
        totalRevenue: data.totalRevenue,
        bookingCount: data.bookingCount,
        cancellationRate: data.cancellationRate,
      },
      update: {
        organizationId: data.organizationId,
        occupancyRate: data.occupancyRate,
        adr: data.adr,
        revpar: data.revpar,
        totalRevenue: data.totalRevenue,
        bookingCount: data.bookingCount,
        cancellationRate: data.cancellationRate,
      },
    });
    return toRevenueMetric(r);
  }

  async create(data: CreateRevenueMetricData): Promise<RevenueMetric> {
    const r = await this.db.revenueMetric.create({
      data: {
        organizationId: data.organizationId,
        hotelId: data.hotelId,
        metricDate: data.metricDate,
        occupancyRate: data.occupancyRate,
        adr: data.adr,
        revpar: data.revpar,
        totalRevenue: data.totalRevenue,
        bookingCount: data.bookingCount,
        cancellationRate: data.cancellationRate,
      },
    });
    return toRevenueMetric(r);
  }

  async update(id: string, data: UpdateRevenueMetricData): Promise<RevenueMetric> {
    const payload: Prisma.RevenueMetricUpdateInput = {};
    if (data.occupancyRate !== undefined) payload.occupancyRate = data.occupancyRate;
    if (data.adr !== undefined) payload.adr = data.adr;
    if (data.revpar !== undefined) payload.revpar = data.revpar;
    if (data.totalRevenue !== undefined) payload.totalRevenue = data.totalRevenue;
    if (data.bookingCount !== undefined) payload.bookingCount = data.bookingCount;
    if (data.cancellationRate !== undefined) payload.cancellationRate = data.cancellationRate;

    const r = await this.db.revenueMetric.update({ where: { id }, data: payload });
    return toRevenueMetric(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.revenueMetric.delete({ where: { id } });
  }

  async getAverageMetrics(
    hotelId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    avgOccupancy: number;
    avgAdr: number;
    avgRevpar: number;
    totalRevenue: number;
  }> {
    const result = await this.db.revenueMetric.aggregate({
      where: {
        hotelId,
        metricDate: { gte: startDate, lte: endDate },
      },
      _avg: {
        occupancyRate: true,
        adr: true,
        revpar: true,
      },
      _sum: {
        totalRevenue: true,
      },
    });

    return {
      avgOccupancy: result._avg.occupancyRate?.toNumber() ?? 0,
      avgAdr: result._avg.adr?.toNumber() ?? 0,
      avgRevpar: result._avg.revpar?.toNumber() ?? 0,
      totalRevenue: result._sum.totalRevenue?.toNumber() ?? 0,
    };
  }
}
