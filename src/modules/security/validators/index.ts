import { ZodError } from "zod";
import { ValidationError } from "@errors/HttpError";
import {
  RevokeSessionDto, RevokeAllSessionsDto, SessionFilterDto, SecurityEventFilterDto,
  type RevokeSessionDtoType, type RevokeAllSessionsDtoType,
  type SessionFilterDtoType, type SecurityEventFilterDtoType,
} from "../dto";

function wrapZod<T>(fn: () => T): T {
  try { return fn(); }
  catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError("Validation failed", error.errors.map((e) => ({ field: e.path.join("."), message: e.message })));
    }
    throw error;
  }
}

export function validateRevokeSession(data: unknown): RevokeSessionDtoType {
  return wrapZod(() => RevokeSessionDto.parse(data)) as RevokeSessionDtoType;
}
export function validateRevokeAllSessions(data: unknown): RevokeAllSessionsDtoType {
  return wrapZod(() => RevokeAllSessionsDto.parse(data)) as RevokeAllSessionsDtoType;
}
export function validateSessionFilter(data: unknown): SessionFilterDtoType {
  return wrapZod(() => SessionFilterDto.parse(data)) as SessionFilterDtoType;
}
export function validateSecurityEventFilter(data: unknown): SecurityEventFilterDtoType {
  return wrapZod(() => SecurityEventFilterDto.parse(data)) as SecurityEventFilterDtoType;
}
