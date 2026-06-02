import { BaseService } from "@lib/baseService";
import { logger } from "@modules/monitoring/loggers";
import type { PrismaSecurityEventRepository } from "../repositories/PrismaSecurityEventRepository";
import type { SecurityEvent, CreateSecurityEventData, SecurityEventFilter } from "../types";
import { SuspiciousActivityDetector } from "../strategies/SuspiciousActivityDetector";
import { BRUTE_FORCE, RISK_SCORE_THRESHOLDS } from "../constants";
import type { RiskAssessment } from "../types";
import type { SecurityEventFilterDtoType } from "../dto";
import type { PaginatedResult } from "@shared-types";

export class SecurityEventService extends BaseService {
  protected readonly moduleName = "SecurityEventService";

  constructor(private readonly eventRepo: PrismaSecurityEventRepository) {
    super();
  }

  async logEvent(data: CreateSecurityEventData): Promise<SecurityEvent> {
    return this.execute("logEvent", async () => {
      const event = await this.eventRepo.create(data);
      if (data.severity === "CRITICAL" || data.severity === "HIGH") {
        logger.warn(`Security event: ${data.eventType}`, {
          module: "SecurityEventService",
          organizationId: data.organizationId,
          meta: { eventType: data.eventType, severity: data.severity, userId: data.userId },
        });
      }
      return event;
    });
  }

  async assessLoginRisk(userId: string, ipAddress: string, deviceId: string): Promise<RiskAssessment> {
    return this.execute("assessLoginRisk", async () => {
      const assessment = await SuspiciousActivityDetector.assessLoginRisk(userId, ipAddress, deviceId);
      if (assessment.riskScore >= RISK_SCORE_THRESHOLDS.SUSPICIOUS) {
        await this.eventRepo.create({
          userId,
          ipAddress,
          eventType: assessment.riskScore >= RISK_SCORE_THRESHOLDS.CRITICAL
            ? "BRUTE_FORCE_DETECTED"
            : "SUSPICIOUS_ACTIVITY",
          severity: assessment.riskScore >= RISK_SCORE_THRESHOLDS.CRITICAL ? "CRITICAL" : "HIGH",
          metadata: { riskScore: assessment.riskScore, indicators: assessment.indicators },
        });
      }
      return assessment;
    });
  }

  async listEvents(filter: SecurityEventFilterDtoType): Promise<PaginatedResult<SecurityEvent>> {
    return this.execute("listEvents", async () => {
      const eventFilter: SecurityEventFilter = {
        organizationId: filter.organizationId,
        userId: filter.userId,
        eventType: filter.eventType,
        severity: filter.severity,
        startDate: filter.startDate,
        endDate: filter.endDate,
        page: filter.page,
        limit: filter.limit,
      };
      return this.eventRepo.findManyFiltered(eventFilter);
    });
  }

  async getRecentFailedLogins(userId: string, windowMinutes = BRUTE_FORCE.WINDOW_MINUTES): Promise<number> {
    return this.execute("getRecentFailedLogins", async () =>
      this.eventRepo.countRecentByType(userId, "LOGIN_FAILED", windowMinutes)
    );
  }
}
