import { ZodError } from "zod";
import { ValidationError } from "@errors/HttpError";
import { CreateJobDto, JobFilterDto, type CreateJobDtoType, type JobFilterDtoType } from "../dto";

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

export function validateCreateJob(data: unknown): CreateJobDtoType {
  return wrapZod(() => CreateJobDto.parse(data)) as CreateJobDtoType;
}

export function validateJobFilter(data: unknown): JobFilterDtoType {
  return wrapZod(() => JobFilterDto.parse(data)) as JobFilterDtoType;
}
