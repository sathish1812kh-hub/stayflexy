import { BaseService } from "@lib/baseService";
import { prisma } from "@lib/prisma";
import { ForbiddenError } from "@errors/HttpError";
import { getActiveProvider } from "../providers";
import type { AIOrchestrationRequest, AIOrchestrationResult } from "../types";

export class AIOrchestrationService extends BaseService {
  protected readonly moduleName = "AIOrchestrationService";

  private async validateHotelAccess(hotelId: string, orgId: string): Promise<void> {
    const hotel = await prisma.hotel.findFirst({
      where: { id: hotelId, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!hotel) throw new ForbiddenError("Hotel not found or access denied");
  }

  async orchestrate(req: AIOrchestrationRequest): Promise<AIOrchestrationResult> {
    return this.execute("orchestrate", async () => {
      await this.validateHotelAccess(req.hotelId, req.organizationId);

      const provider = getActiveProvider();
      const start = Date.now();
      let results: unknown[] = [];

      switch (req.operation) {
        case "RECOMMENDATIONS": {
          const { recommendationService } = await import("@modules/recommendations/container");
          results = await recommendationService.generateRecommendations(
            { hotelId: req.hotelId, types: [] },
            req.organizationId
          );
          break;
        }
        case "ANOMALIES": {
          const { intelligenceService } = await import("@modules/intelligence/container");
          results = await intelligenceService.detectAnomalies(req.hotelId, req.organizationId);
          break;
        }
        case "INSIGHTS": {
          const { intelligenceService } = await import("@modules/intelligence/container");
          results = await intelligenceService.generateInsights({ hotelId: req.hotelId }, req.organizationId);
          break;
        }
        case "FORECAST": {
          const { revenueService } = await import("@modules/revenue/container");
          const forecast = await revenueService.getForecast(
            { hotelId: req.hotelId, forecastDays: 30 },
            req.organizationId
          );
          results = [forecast];
          break;
        }
      }

      return {
        operation: req.operation,
        hotelId: req.hotelId,
        generatedAt: new Date(),
        results,
        provider: provider.providerName,
        processingMs: Date.now() - start,
      };
    });
  }
}
