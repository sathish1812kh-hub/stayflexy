export type SessionStatusType = "ACTIVE" | "REVOKED" | "EXPIRED" | "LOGGED_OUT";
export type SecurityEventTypeType =
  | "LOGIN_SUCCESS" | "LOGIN_FAILED" | "TOKEN_REVOKED" | "SUSPICIOUS_ACTIVITY"
  | "BRUTE_FORCE_DETECTED" | "SESSION_HIJACK_ATTEMPT" | "UNAUTHORIZED_ACCESS"
  | "DATA_EXPORT_REQUESTED" | "ADMIN_ACTION" | "RATE_LIMIT_EXCEEDED"
  | "MFA_CHALLENGE" | "PERMISSION_DENIED";
export type SecuritySeverityType = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface UserSession {
  id: string;
  userId: string;
  organizationId: string | null;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  refreshTokenHash: string;
  sessionStatus: SessionStatusType;
  lastActivityAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SecurityEvent {
  id: string;
  organizationId: string | null;
  hotelId: string | null;
  userId: string | null;
  eventType: SecurityEventTypeType;
  severity: SecuritySeverityType;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  detectedAt: Date;
}

export interface CreateUserSessionData {
  userId: string;
  organizationId?: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  refreshTokenHash: string;
  expiresAt: Date;
}

export interface CreateSecurityEventData {
  organizationId?: string;
  hotelId?: string;
  userId?: string;
  eventType: SecurityEventTypeType;
  severity?: SecuritySeverityType;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface SessionFilter {
  userId?: string;
  organizationId?: string;
  sessionStatus?: SessionStatusType;
  page?: number;
  limit?: number;
}

export interface SecurityEventFilter {
  organizationId?: string;
  userId?: string;
  eventType?: SecurityEventTypeType;
  severity?: SecuritySeverityType;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface RiskAssessment {
  riskScore: number;
  indicators: string[];
  recommendedAction: "NONE" | "LOG" | "ALERT" | "BLOCK";
}
