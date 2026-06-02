// FILE: src/modules/housekeeping/validators/index.ts
import { ZodError } from "zod";
import { ValidationError } from "@errors/HttpError";
import {
  CreateHousekeepingTaskDto,
  UpdateHousekeepingTaskDto,
  AssignTaskDto,
  UpdateTaskStatusDto,
  HousekeepingTaskFilterDto,
  RoomStatusFilterDto,
  type CreateHousekeepingTaskDtoType,
  type UpdateHousekeepingTaskDtoType,
  type AssignTaskDtoType,
  type UpdateTaskStatusDtoType,
  type HousekeepingTaskFilterDtoType,
  type RoomStatusFilterDtoType,
} from "../dto";

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

export function validateCreateHousekeepingTask(
  data: unknown
): CreateHousekeepingTaskDtoType {
  return wrapZod(() => CreateHousekeepingTaskDto.parse(data));
}

export function validateUpdateHousekeepingTask(
  data: unknown
): UpdateHousekeepingTaskDtoType {
  return wrapZod(() => UpdateHousekeepingTaskDto.parse(data));
}

export function validateAssignTask(data: unknown): AssignTaskDtoType {
  return wrapZod(() => AssignTaskDto.parse(data));
}

export function validateUpdateTaskStatus(
  data: unknown
): UpdateTaskStatusDtoType {
  return wrapZod(() => UpdateTaskStatusDto.parse(data));
}

export function validateHousekeepingTaskFilter(
  data: unknown
): HousekeepingTaskFilterDtoType {
  return wrapZod(() => HousekeepingTaskFilterDto.parse(data));
}

export function validateRoomStatusFilter(data: unknown): RoomStatusFilterDtoType {
  return wrapZod(() => RoomStatusFilterDto.parse(data));
}
