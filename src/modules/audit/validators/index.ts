// FILE: src/modules/audit/validators/index.ts
import { ZodError } from "zod";
import { ValidationError } from "@errors/HttpError";
import { SENSITIVE_FIELDS_TO_REDACT } from "../constants";
import { AuditFilterDto, type AuditFilterDtoType } from "../dto";
export { validateAuditLogFilter, validateEntityAuditFilter } from "./centralAuditLog";

function parseOrThrow<T>(
  schema: { parse: (data: unknown) => T },
  data: unknown
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      throw new ValidationError("Validation failed", details);
    }
    throw error;
  }
}

export function validateAuditFilter(data: unknown): AuditFilterDtoType {
  return parseOrThrow(AuditFilterDto, data);
}

/**
 * Recursively removes sensitive fields from any data structure before
 * storing it in the audit log. Operates on plain objects and arrays;
 * all other values are returned unchanged.
 */
export function redactSensitiveFields(data: unknown): unknown {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map(redactSensitiveFields);
  }

  if (typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
      data as Record<string, unknown>
    )) {
      if (SENSITIVE_FIELDS_TO_REDACT.includes(key)) {
        result[key] = "[REDACTED]";
      } else {
        result[key] = redactSensitiveFields(value);
      }
    }
    return result;
  }

  return data;
}
