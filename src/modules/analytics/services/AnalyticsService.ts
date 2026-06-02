// FILE: src/modules/analytics/services/AnalyticsService.ts
import { BaseService } from "@lib/baseService";
import { prisma } from "@lib/prisma";
import { ForbiddenError } from "@errors/HttpError";
import type { PaginatedResult } from "@shared-types";
import type { PrismaAnalyticsSnapshotRepository } from "../repositories/PrismaAnalyticsSnapshotRepository";
import type {
  AnalyticsSnapshot,
  BookingAnalytics,
  PaymentAnalytics,
  OTAAnalytics,
  OperationsAnalytics,
  SnapshotTypeType,
} from "../types";
import type {
  AnalyticsQueryDtoType,
  SnapshotFilterDtoType,
} from "../dto";
import { ANALYTICS_ERRORS } from "../constants";
import {
  BookingAggregator,
  PaymentAggregator,
  OTAAggregator,
  OperationsAggregator,
} from "../aggregators";

export class AnalyticsService extends BaseService {
  protected readonly moduleName = "AnalyticsService";

  constructor(
    private readonly snapshotRepo: PrismaAnalyticsSnapshotRepository
  ) {
    super();
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async validateHotelAccess(hotelId: string, orgId: string): Promise<void> {
    const hotel = await prisma.hotel.findFirst({
      where: { id: hotelId, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!hotel) throw new ForbiddenError(ANALYTICS_ERRORS.HOTEL_NOT_FOUND);
  }

  // ─── getBookingAnalytics ──────────────────────────────────────────────────────

  async getBookingAnalytics(
    dto: AnalyticsQueryDtoType,
    orgId: string
  ): Promise<BookingAnalytics> {
    return this.execute("getBookingAnalytics", async () => {
      await this.validateHotelAccess(dto.hotelId, orgId);
      const startDate = new Date(dto.startDate);
      const endDate = new Date(dto.endDate);
      return BookingAggregator.aggregate(dto.hotelId, orgId, startDate, endDate);
    });
  }

  // ─── getPaymentAnalytics ──────────────────────────────────────────────────────

  async getPaymentAnalytics(
    dto: AnalyticsQueryDtoType,
    orgId: string
  ): Promise<PaymentAnalytics> {
    return this.execute("getPaymentAnalytics", async () => {
      await this.validateHotelAccess(dto.hotelId, orgId);
      const startDate = new Date(dto.startDate);
      const endDate = new Date(dto.endDate);
      return PaymentAggregator.aggregate(dto.hotelId, orgId, startDate, endDate);
    });
  }

  // ─── getOTAAnalytics ──────────────────────────────────────────────────────────

  async getOTAAnalytics(
    dto: AnalyticsQueryDtoType,
    orgId: string
  ): Promise<OTAAnalytics> {
    return this.execute("getOTAAnalytics", async () => {
      await this.validateHotelAccess(dto.hotelId, orgId);
      const startDate = new Date(dto.startDate);
      const endDate = new Date(dto.endDate);
      return OTAAggregator.aggregate(dto.hotelId, orgId, startDate, endDate);
    });
  }

  // ─── getOperationsAnalytics ───────────────────────────────────────────────────

  async getOperationsAnalytics(
    dto: AnalyticsQueryDtoType,
    orgId: string
  ): Promise<OperationsAnalytics> {
    return this.execute("getOperationsAnalytics", async () => {
      await this.validateHotelAccess(dto.hotelId, orgId);
      const startDate = new Date(dto.startDate);
      const endDate = new Date(dto.endDate);
      return OperationsAggregator.aggregate(dto.hotelId, orgId, startDate, endDate);
    });
  }

  // ─── generateSnapshot ─────────────────────────────────────────────────────────

  async generateSnapshot(
    hotelId: string,
    snapshotType: SnapshotTypeType,
    snapshotDate: Date,
    metricsPayload: Record<string, unknown>,
    orgId: string
  ): Promise<AnalyticsSnapshot> {
    return this.execute("generateSnapshot", async () => {
      await this.validateHotelAccess(hotelId, orgId);
      return this.snapshotRepo.upsertSnapshot({
        organizationId: orgId,
        hotelId,
        snapshotType,
        snapshotDate,
        metricsPayload,
      });
    });
  }

  // ─── listSnapshots ────────────────────────────────────────────────────────────

  async listSnapshots(
    filter: SnapshotFilterDtoType,
    orgId: string
  ): Promise<PaginatedResult<AnalyticsSnapshot>> {
    return this.execute("listSnapshots", async () => {
      await this.validateHotelAccess(filter.hotelId, orgId);
      return this.snapshotRepo.findManyFiltered({
        organizationId: orgId,
        hotelId: filter.hotelId,
        snapshotType: filter.snapshotType as SnapshotTypeType | undefined,
        startDate: filter.startDate ? new Date(filter.startDate) : undefined,
        endDate: filter.endDate ? new Date(filter.endDate) : undefined,
        page: filter.page,
        limit: filter.limit,
      });
    });
  }
}
