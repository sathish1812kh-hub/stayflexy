import { ZodError } from "zod";
import { ValidationError } from "@errors/HttpError";
import { InitiateRecoveryDto, RecoveryFilterDto } from "../dto";
import type { InitiateRecoveryDtoType, RecoveryFilterDtoType } from "../dto";

function wrapZod<T>(fn: () => T): T {
  try { return fn(); }
  catch (e) {
    if (e instanceof ZodError) {
      throw new ValidationError("Validation failed", e.errors.map((x) => ({ field: x.path.join("."), message: x.message })));
    }
    throw e;
  }
}

export function validateInitiateRecovery(data: unknown): InitiateRecoveryDtoType {
  return wrapZod(() => InitiateRecoveryDto.parse(data)) as InitiateRecoveryDtoType;
}

export function validateRecoveryFilter(data: unknown): RecoveryFilterDtoType {
  return wrapZod(() => RecoveryFilterDto.parse(data)) as RecoveryFilterDtoType;
}
