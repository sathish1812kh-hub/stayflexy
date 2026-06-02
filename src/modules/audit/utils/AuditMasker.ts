import { SENSITIVE_FIELDS } from "../constants/centralAuditLog";

export class AuditMasker {
  /**
   * Deep-clones a state object and replaces sensitive field values with "***MASKED***".
   */
  static maskState(state: Record<string, unknown>): Record<string, unknown> {
    const masked = { ...state };
    for (const field of SENSITIVE_FIELDS) {
      if (field in masked) {
        masked[field] = "***MASKED***";
      }
    }
    // Recursively mask nested objects (one level deep)
    for (const [key, value] of Object.entries(masked)) {
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        masked[key] = AuditMasker.maskState(value as Record<string, unknown>);
      }
    }
    return masked;
  }

  /**
   * Extracts IP and UserAgent from Next.js request headers.
   */
  static extractRequestMeta(headers: Headers): {
    ipAddress: string | null;
    userAgent: string | null;
  } {
    const ipAddress =
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headers.get("x-real-ip") ??
      null;
    const userAgent = headers.get("user-agent") ?? null;
    return { ipAddress, userAgent };
  }
}
