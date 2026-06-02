// API hardening utilities — payload sanitization, request validation, size limits.

export const HARDENING_LIMITS = {
  MAX_PAYLOAD_BYTES: 1_048_576,
  MAX_QUERY_PARAMS: 20,
  MAX_HEADER_VALUE_LENGTH: 8192,
} as const;

const FORBIDDEN_FIELDS = ["__proto__", "constructor", "prototype", "adminOverride", "bypassRbac"];
const ALLOWED_CONTENT_TYPES = ["application/json", "multipart/form-data"];

export interface SanitizedPayload {
  sanitized: Record<string, unknown>;
  removedFields: string[];
}

export class PayloadSanitizer {
  static sanitize(payload: Record<string, unknown>): SanitizedPayload {
    const sanitized: Record<string, unknown> = {};
    const removedFields: string[] = [];
    for (const [key, value] of Object.entries(payload)) {
      if (FORBIDDEN_FIELDS.includes(key)) { removedFields.push(key); continue; }
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        const nested = PayloadSanitizer.sanitize(value as Record<string, unknown>);
        sanitized[key] = nested.sanitized;
        removedFields.push(...nested.removedFields.map((f) => `${key}.${f}`));
      } else {
        sanitized[key] = value;
      }
    }
    return { sanitized, removedFields };
  }

  static checkSize(raw: string, maxBytes = HARDENING_LIMITS.MAX_PAYLOAD_BYTES): boolean {
    return Buffer.byteLength(raw, "utf8") <= maxBytes;
  }
}

import type { NextRequest } from "next/server";

export class RequestValidator {
  static validateContentType(req: NextRequest): { valid: boolean; errors: string[] } {
    if (!["POST", "PATCH", "PUT"].includes(req.method)) return { valid: true, errors: [] };
    const ct = req.headers.get("content-type") ?? "";
    const ok = ALLOWED_CONTENT_TYPES.some((t) => ct.startsWith(t));
    return { valid: ok, errors: ok ? [] : [`Content-Type must be one of: ${ALLOWED_CONTENT_TYPES.join(", ")}`] };
  }

  static validateHeaders(req: NextRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    for (const [key, value] of req.headers) {
      if (value.length > HARDENING_LIMITS.MAX_HEADER_VALUE_LENGTH) errors.push(`Header '${key}' too long`);
      if (/[\r\n]/.test(value)) errors.push(`Header '${key}' contains CRLF injection attempt`);
    }
    return { valid: errors.length === 0, errors };
  }
}

export const SECURITY_POLICY = {
  maxPayloadBytes: HARDENING_LIMITS.MAX_PAYLOAD_BYTES,
  allowedContentTypes: ALLOWED_CONTENT_TYPES,
  maxQueryParams: HARDENING_LIMITS.MAX_QUERY_PARAMS,
  forbiddenPayloadFields: FORBIDDEN_FIELDS,
} as const;
