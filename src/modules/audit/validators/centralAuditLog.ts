import { ZodError } from "zod";
import { ValidationError } from "@errors/HttpError";
import {
  AuditLogFilterDto,
  EntityAuditFilterDto,
  type AuditLogFilterDtoType,
  type EntityAuditFilterDtoType,
} from "../dto/centralAuditLog";

function wrapZod<T>(fn: () => T): T {
  try {
    return fn();
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

export function validateAuditLogFilter(data: unknown): AuditLogFilterDtoType {
  return wrapZod(() => AuditLogFilterDto.parse(data));
}

export function validateEntityAuditFilter(data: unknown): EntityAuditFilterDtoType {
  return wrapZod(() => EntityAuditFilterDto.parse(data));
}
