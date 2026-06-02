// FILE: src/modules/intelligence/services/IntelligenceService.ts
import { BaseService } from "@lib/baseService";
import { prisma } from "@lib/prisma";
import { ForbiddenError } from "@errors/HttpError";
import type { PaginatedResult } from "@shared-types";
import type { PrismaOperationalInsightRepository } from "../repositories/PrismaOperationalInsightRepository";
import type { PrismaAnomalyDetectionRepository } from "../repositories/PrismaAnomalyDetectionRepository";
import type {
  OperationalInsight,
  AnomalyDetection,
  InsightFilter,
  AnomalyFilter,
  InsightSeverityType,
  AnomalyTypeType,
  InsightTypeType,
} from "../types";
import type {
  GenerateInsightsDtoType,
  InsightFilterDtoType,
  AnomalyFilterDtoType,
} from "../dto";
import { INTELLIGENCE_ERRORS, RISK_THRESHOLDS } from "../constants";
import {
  BookingAnomalyAnalyzer,
  OTAAnomalyAnalyzer,
  OperationalAnomalyAnalyzer,
} from "../analyzers";
import type { AnomalyResult } from "../analyzers";

export class IntelligenceService extends BaseService {
  protected readonly moduleName = "IntelligenceService";

  constructor(
    private readonly insightRepo: PrismaOperationalInsightRepository,
    private readonly anomalyRepo: PrismaAnomalyDetectionRepository
  ) {
    super();
  }

  private async validateHotelAccess(hotelId: string, orgId: string): Promise<void> {
    const hotel = await prisma.hotel.findFirst({
      where: { id: hotelId, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!hotel) throw new ForbiddenError(INTELLIGENCE_ERRORS.HOTEL_NOT_FOUND);
  }

  private computeSeverity(riskScore: number): InsightSeverityType {
    if (riskScore >= RISK_THRESHOLDS.CRITICAL) return "CRITICAL";
    if (riskScore >= RISK_THRESHOLDS.WARNING) return "WARNING";
    return "INFO";
  }

  async generateInsights(
    dto: GenerateInsightsDtoType,
    orgId: string
  ): Promise<OperationalInsight[]> {
    return this.execute("generateInsights", async () => {
      await this.validateHotelAccess(dto.hotelId, orgId);

      // Run all analyzers in parallel
      const [cancellationResult, paymentResult, syncResult, operationalResult] =
        await Promise.allSettled([
          BookingAnomalyAnalyzer.detectCancellationSpike(dto.hotelId, orgId),
          BookingAnomalyAnalyzer.detectPaymentAnomaly(dto.hotelId, orgId),
          OTAAnomalyAnalyzer.detectSyncFailures(dto.hotelId, orgId),
          OperationalAnomalyAnalyzer.detectOperationalDelay(dto.hotelId, orgId),
        ]);

      // Map anomaly result to insight type
      const insightTypeMap: Record<string, InsightTypeType> = {
        UNUSUAL_CANCELLATION: "CANCELLATION_SPIKE",
        PAYMENT_ANOMALY: "REVENUE_ANOMALY",
        OTA_SYNC_FAILURE: "BOOKING_PATTERN",
        OPERATIONAL_DELAY: "OPERATIONAL_BOTTLENECK",
      };

      const results: AnomalyResult[] = [];
      for (const settled of [
        cancellationResult,
        paymentResult,
        syncResult,
        operationalResult,
      ]) {
        if (settled.status === "fulfilled" && settled.value !== null) {
          results.push(settled.value);
        }
      }

      const created: OperationalInsight[] = [];

      for (const result of results) {
        const insightType =
          insightTypeMap[result.anomalyType] ?? "OPERATIONAL_BOTTLENECK";
        const severity = this.computeSeverity(result.riskScore);

        const insight = await this.insightRepo.create({
          organizationId: orgId,
          hotelId: dto.hotelId,
          insightType: insightType as InsightTypeType,
          insightPayload: {
            ...result.payload,
            sourceAnomalyType: result.anomalyType,
            riskScore: result.riskScore,
          },
          severity,
        });

        created.push(insight);
      }

      this.getLogger().info("Insights generated", {
        hotelId: dto.hotelId,
        count: created.length,
      });

      return created;
    });
  }

  async detectAnomalies(
    hotelId: string,
    orgId: string
  ): Promise<AnomalyDetection[]> {
    return this.execute("detectAnomalies", async () => {
      await this.validateHotelAccess(hotelId, orgId);

      const [cancellationResult, paymentResult, syncResult, operationalResult] =
        await Promise.allSettled([
          BookingAnomalyAnalyzer.detectCancellationSpike(hotelId, orgId),
          BookingAnomalyAnalyzer.detectPaymentAnomaly(hotelId, orgId),
          OTAAnomalyAnalyzer.detectSyncFailures(hotelId, orgId),
          OperationalAnomalyAnalyzer.detectOperationalDelay(hotelId, orgId),
        ]);

      const results: AnomalyResult[] = [];
      for (const settled of [
        cancellationResult,
        paymentResult,
        syncResult,
        operationalResult,
      ]) {
        if (settled.status === "fulfilled" && settled.value !== null) {
          results.push(settled.value);
        }
      }

      const created: AnomalyDetection[] = [];

      for (const result of results) {
        if (result.riskScore <= 0) continue;

        const anomaly = await this.anomalyRepo.create({
          organizationId: orgId,
          hotelId,
          anomalyType: result.anomalyType as AnomalyTypeType,
          anomalyPayload: result.payload,
          riskScore: result.riskScore,
        });

        created.push(anomaly);
      }

      this.getLogger().info("Anomalies detected", {
        hotelId,
        count: created.length,
      });

      return created;
    });
  }

  async listInsights(
    filter: InsightFilterDtoType,
    orgId: string
  ): Promise<PaginatedResult<OperationalInsight>> {
    return this.execute("listInsights", async () => {
      await this.validateHotelAccess(filter.hotelId, orgId);

      const repoFilter: InsightFilter = {
        organizationId: orgId,
        hotelId: filter.hotelId,
        insightType: filter.insightType,
        severity: filter.severity,
        page: filter.page,
        limit: filter.limit,
      };

      return this.insightRepo.findManyFiltered(repoFilter);
    });
  }

  async listAnomalies(
    filter: AnomalyFilterDtoType,
    orgId: string
  ): Promise<PaginatedResult<AnomalyDetection>> {
    return this.execute("listAnomalies", async () => {
      await this.validateHotelAccess(filter.hotelId, orgId);

      const repoFilter: AnomalyFilter = {
        organizationId: orgId,
        hotelId: filter.hotelId,
        anomalyType: filter.anomalyType,
        minRiskScore: filter.minRiskScore,
        page: filter.page,
        limit: filter.limit,
      };

      return this.anomalyRepo.findManyFiltered(repoFilter);
    });
  }
}
