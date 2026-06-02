import { ZodError } from "zod";
import { ValidationError } from "@errors/HttpError";
import { CreateBackupDto, BackupFilterDto } from "../dto";
import type { CreateBackupDtoType, BackupFilterDtoType } from "../dto";

function wrapZod<T>(fn: () => T): T {
  try { return fn(); }
  catch (e) {
    if (e instanceof ZodError) {
      throw new ValidationError("Validation failed", e.errors.map((x) => ({ field: x.path.join("."), message: x.message })));
    }
    throw e;
  }
}

export function validateCreateBackup(data: unknown): CreateBackupDtoType {
  return wrapZod(() => CreateBackupDto.parse(data)) as CreateBackupDtoType;
}

export function validateBackupFilter(data: unknown): BackupFilterDtoType {
  return wrapZod(() => BackupFilterDto.parse(data)) as BackupFilterDtoType;
}
