import { prisma } from "@lib/prisma";
import { BRUTE_FORCE, RISK_SCORE_THRESHOLDS } from "../constants";
import type { RiskAssessment } from "../types";

export class SuspiciousActivityDetector {
  static async assessLoginRisk(
    userId: string,
    ipAddress: string,
    deviceId: string,
    windowMinutes = BRUTE_FORCE.WINDOW_MINUTES
  ): Promise<RiskAssessment> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
    const indicators: string[] = [];
    let riskScore = 0;

    const [failedAttempts, ipAttacks, knownDevice, activeSessions] = await Promise.all([
      prisma.securityEvent.count({
        where: { userId, eventType: "LOGIN_FAILED", detectedAt: { gte: windowStart } },
      }),
      prisma.securityEvent.count({
        where: { ipAddress, eventType: "LOGIN_FAILED", detectedAt: { gte: windowStart } },
      }),
      prisma.userSession.findFirst({
        where: { userId, deviceId, sessionStatus: { not: "REVOKED" } },
        select: { id: true },
      }),
      prisma.userSession.count({
        where: { userId, sessionStatus: "ACTIVE", expiresAt: { gt: new Date() } },
      }),
    ]);

    if (failedAttempts >= BRUTE_FORCE.MAX_FAILED_ATTEMPTS) {
      riskScore += 60;
      indicators.push(`${failedAttempts} failed logins in last ${windowMinutes}min`);
    } else if (failedAttempts >= 3) {
      riskScore += 30;
      indicators.push(`${failedAttempts} failed login attempts`);
    }

    if (ipAttacks >= 10) {
      riskScore += 25;
      indicators.push(`IP ${ipAddress} has ${ipAttacks} failed attempts across accounts`);
    }

    if (!knownDevice && failedAttempts === 0) {
      riskScore += 10;
      indicators.push("Login from unrecognized device");
    }

    if (activeSessions >= 5) {
      riskScore += 15;
      indicators.push(`${activeSessions} concurrent active sessions`);
    }

    const score = Math.min(100, riskScore);
    const recommendedAction =
      score >= RISK_SCORE_THRESHOLDS.CRITICAL ? "BLOCK" :
      score >= RISK_SCORE_THRESHOLDS.HIGH_RISK ? "ALERT" :
      score >= RISK_SCORE_THRESHOLDS.SUSPICIOUS ? "LOG" : "NONE";

    return { riskScore: score, indicators, recommendedAction };
  }
}
