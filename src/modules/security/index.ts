export type {
  UserSession, SecurityEvent, CreateUserSessionData, CreateSecurityEventData,
  SessionFilter, SecurityEventFilter, RiskAssessment,
  SessionStatusType, SecurityEventTypeType, SecuritySeverityType,
} from "./types";
export { SECURITY_ERRORS, SESSION_DEFAULTS, BRUTE_FORCE, RISK_SCORE_THRESHOLDS } from "./constants";
export { RevokeSessionDto, RevokeAllSessionsDto, SessionFilterDto, SecurityEventFilterDto } from "./dto";
export type { RevokeSessionDtoType, RevokeAllSessionsDtoType, SessionFilterDtoType, SecurityEventFilterDtoType } from "./dto";
export { validateRevokeSession, validateRevokeAllSessions, validateSessionFilter, validateSecurityEventFilter } from "./validators";
export { PrismaUserSessionRepository, PrismaSecurityEventRepository } from "./repositories";
export { SuspiciousActivityDetector } from "./strategies/SuspiciousActivityDetector";
export { extractDeviceId, extractClientIp, applySessionSecurityHeaders } from "./middleware";
export { UserSessionService, SecurityEventService } from "./services";
export { userSessionService, securityEventService } from "./container";
