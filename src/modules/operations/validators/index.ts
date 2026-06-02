import { ZodError } from "zod";
import { ValidationError } from "@errors/HttpError";
import {
  CreateOperationalTaskDto,
  UpdateOperationalTaskDto,
  UpdateOperationalTaskStatusDto,
  OperationalTaskFilterDto,
  WorkloadQueryDto,
  type CreateOperationalTaskDtoType,
  type UpdateOperationalTaskDtoType,
  type UpdateOperationalTaskStatusDtoType,
  type OperationalTaskFilterDtoType,
  type WorkloadQueryDtoType,
} from "../dto";

function wrapZod<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((e) => ({ field: e.path.join("."), message: e.message }));
      throw new ValidationError("Validation failed", details);
    }
    throw error;
  }
}

export function validateCreateOperationalTask(data: unknown): CreateOperationalTaskDtoType {
  return wrapZod(() => CreateOperationalTaskDto.parse(data)) as CreateOperationalTaskDtoType;
}

export function validateUpdateOperationalTask(data: unknown): UpdateOperationalTaskDtoType {
  return wrapZod(() => UpdateOperationalTaskDto.parse(data)) as UpdateOperationalTaskDtoType;
}

export function validateUpdateOperationalTaskStatus(data: unknown): UpdateOperationalTaskStatusDtoType {
  return wrapZod(() => UpdateOperationalTaskStatusDto.parse(data)) as UpdateOperationalTaskStatusDtoType;
}

export function validateOperationalTaskFilter(data: unknown): OperationalTaskFilterDtoType {
  return wrapZod(() => OperationalTaskFilterDto.parse(data)) as OperationalTaskFilterDtoType;
}

export function validateWorkloadQuery(data: unknown): WorkloadQueryDtoType {
  return wrapZod(() => WorkloadQueryDto.parse(data)) as WorkloadQueryDtoType;
}
