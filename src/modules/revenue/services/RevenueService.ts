// FILE: src/modules/revenue/services/RevenueService.ts
import { BaseService } from "@lib/baseService";
import { prisma } from "@lib/prisma";
import { ForbiddenError } from "@errors/HttpError";
import type { PaginatedResult } from "@shared-types";
import type { PrismaRevenueMetricRepository } from "../repositories/PrismaRevenueMetricRepository";
import type {
  RevenueMetric,
  OccupancyResult,
  RevenueForecast,
} from "../types";
import type {
  RevenueMetricFilterDtoType,
  OccupancyQueryDtoType,
  ForecastQueryDtoType,
} from "../dto";
import {
  REVENUE_ERRORS,
  FORECAST_METHODOLOGY,
  DEFAULT_CONFIDENCE,
} from "../constants";
import { RevenueCalculator } from "../calculators";

export class RevenueService extends BaseService {
  protected readonly moduleName = "RevenueService";

  constructor(
    private readonly metricRepo: PrismaRevenueMetricRepository
  ) {
    super();
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async validateHotelAccess(
    hotelId: string,
    orgId: string
  ): Promise<{ totalRooms: number }> {
    const hotel = await prisma.hotel.findFirst({
      where: { id: hotelId, organizationId: orgId, deletedAt: null },
      select: { id: true, totalRooms: true },
    });
    if (!hotel) throw new ForbiddenError(REVENUE_ERRORS.HOTEL_NOT_FOUND);
    return { totalRooms: hotel.totalRooms };
  }

  // ─── calculateDailyMetrics ────────────────────────────────────────────────────

  async calculateDailyMetrics(
    hotelId: string,
    date: Date,
    orgId: string
  ): Promise<RevenueMetric> {
    return this.execute("calculateDailyMetrics", async () => {
      const { totalRooms } = await this.validateHotelAccess(hotelId, orgId);

      // Build date boundaries (UTC day)
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);

      // Count confirmed/in-progress bookings created on this date
      const [confirmedCount, cancelledCount] = await Promise.all([
        prisma.booking.count({
          where: {
            hotelId,
            status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
        prisma.booking.count({
          where: {
            hotelId,
            status: "CANCELLED",
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
      ]);

      const bookingCount = confirmedCount + cancelledCount;

      // Count occupied rooms on this date
      const occupiedRooms = await prisma.bookingRoom.count({
        where: {
          hotelId,
          checkInDate: { lte: date },
          checkOutDate: { gt: date },
          status: { not: "CANCELLED" },
        },
      });

      // Sum successful payments on this date
      const revenueResult = await prisma.payment.aggregate({
        where: {
          hotelId,
          paymentStatus: "SUCCESS",
          paidAt: { gte: startOfDay, lt: endOfDay },
        },
        _sum: { amount: true },
      });
      const totalRevenue = revenueResult._sum.amount?.toNumber() ?? 0;

      // Calculate metrics
      const occupancyRate = RevenueCalculator.calculateOccupancyRate(
        occupiedRooms,
        totalRooms
      );
      const adr = RevenueCalculator.calculateADR(
        totalRevenue,
        Math.max(1, occupiedRooms)
      );
      const revpar = RevenueCalculator.calculateRevPAR(adr, occupancyRate);
      const cancellationRate = RevenueCalculator.calculateCancellationRate(
        cancelledCount,
        bookingCount
      );

      // Upsert metric
      const metric = await this.metricRepo.upsertMetric({
        organizationId: orgId,
        hotelId,
        metricDate: startOfDay,
        occupancyRate,
        adr,
        revpar,
        totalRevenue,
        bookingCount,
        cancellationRate,
      });

      return metric;
    });
  }

  // ─── getMetrics ───────────────────────────────────────────────────────────────

  async getMetrics(
    filter: RevenueMetricFilterDtoType,
    orgId: string
  ): Promise<PaginatedResult<RevenueMetric>> {
    return this.execute("getMetrics", async () => {
      await this.validateHotelAccess(filter.hotelId, orgId);

      return this.metricRepo.findManyFiltered({
        organizationId: orgId,
        hotelId: filter.hotelId,
        startDate: filter.startDate ? new Date(filter.startDate) : undefined,
        endDate: filter.endDate ? new Date(filter.endDate) : undefined,
        page: filter.page,
        limit: filter.limit,
      });
    });
  }

  // ─── getOccupancy ─────────────────────────────────────────────────────────────

  async getOccupancy(
    dto: OccupancyQueryDtoType,
    orgId: string
  ): Promise<OccupancyResult> {
    return this.execute("getOccupancy", async () => {
      const { totalRooms } = await this.validateHotelAccess(dto.hotelId, orgId);

      const date = new Date(dto.date);

      const occupiedRooms = await prisma.bookingRoom.count({
        where: {
          hotelId: dto.hotelId,
          checkInDate: { lte: date },
          checkOutDate: { gt: date },
          status: { not: "CANCELLED" },
        },
      });

      const occupancyRate = RevenueCalculator.calculateOccupancyRate(
        occupiedRooms,
        totalRooms
      );

      return {
        hotelId: dto.hotelId,
        date,
        totalRooms,
        occupiedRooms,
        occupancyRate,
      };
    });
  }

  // ─── getForecast ──────────────────────────────────────────────────────────────

  async getForecast(
    dto: ForecastQueryDtoType,
    orgId: string
  ): Promise<RevenueForecast> {
    return this.execute("getForecast", async () => {
      await this.validateHotelAccess(dto.hotelId, orgId);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setUTCDate(startDate.getUTCDate() - 90);

      // Get last 90 days of metrics
      const historicalResult = await this.metricRepo.findManyFiltered({
        hotelId: dto.hotelId,
        startDate,
        endDate,
        page: 1,
        limit: 90,
      });

      const historicalMetrics = historicalResult.data.map((m) => ({
        metricDate: m.metricDate,
        occupancyRate: m.occupancyRate,
        totalRevenue: m.totalRevenue,
      }));

      const forecastDays = dto.forecastDays;
      const periods = RevenueCalculator.forecastRevenue(
        historicalMetrics,
        forecastDays,
        DEFAULT_CONFIDENCE
      );

      const forecastFrom =
        periods.length > 0
          ? (periods[0]?.date ?? new Date())
          : new Date();
      const forecastTo =
        periods.length > 0
          ? (periods[periods.length - 1]?.date ?? new Date())
          : new Date();

      return {
        hotelId: dto.hotelId,
        forecastFrom,
        forecastTo,
        periods,
        methodology: FORECAST_METHODOLOGY,
      };
    });
  }
}
