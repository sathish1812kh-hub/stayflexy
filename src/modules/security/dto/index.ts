import { z } from "zod";

const SessionStatusEnum = z.enum(["ACTIVE", "REVOKED", "EXPIRED", "LOGGED_OUT"]);
const SecurityEventTypeEnum = z.enum([
  "LOGIN_SUCCESS", "LOGIN_FAILED", "TOKEN_REVOKED", "SUSPICIOUS_ACTIVITY",
  "BRUTE_FORCE_DETECTED", "SESSION_HIJACK_ATTEMPT", "UNAUTHORIZED_ACCESS",
  "DATA_EXPORT_REQUESTED", "ADMIN_ACTION", "RATE_LIMIT_EXCEEDED", "MFA_CHALLENGE", "PERMISSION_DENIED",
]);
const SeverityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const RevokeSessionDto = z.object({
  sessionId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});
export type RevokeSessionDtoType = z.infer<typeof RevokeSessionDto>;

export const RevokeAllSessionsDto = z.object({
  userId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});
export type RevokeAllSessionsDtoType = z.infer<typeof RevokeAllSessionsDto>;

export const SessionFilterDto = z.object({
  userId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  sessionStatus: SessionStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type SessionFilterDtoType = z.infer<typeof SessionFilterDto>;

export const SecurityEventFilterDto = z.object({
  organizationId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  eventType: SecurityEventTypeEnum.optional(),
  severity: SeverityEnum.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});
export type SecurityEventFilterDtoType = z.infer<typeof SecurityEventFilterDto>;
