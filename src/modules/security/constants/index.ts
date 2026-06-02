export const SECURITY_ERRORS = {
  SESSION_NOT_FOUND: "Session not found",
  SESSION_REVOKED: "Session has been revoked",
  SESSION_EXPIRED: "Session has expired",
  USER_NOT_FOUND: "User not found",
  BRUTE_FORCE_DETECTED: "Too many failed attempts — account temporarily locked",
} as const;

export const SESSION_DEFAULTS = {
  EXPIRY_DAYS: 7,
  MAX_CONCURRENT_SESSIONS: 5,
  INACTIVITY_TIMEOUT_HOURS: 24,
} as const;

export const BRUTE_FORCE = {
  MAX_FAILED_ATTEMPTS: 5,
  WINDOW_MINUTES: 15,
  LOCKOUT_MINUTES: 30,
} as const;

export const RISK_SCORE_THRESHOLDS = {
  SUSPICIOUS: 50,
  HIGH_RISK: 75,
  CRITICAL: 90,
} as const;
