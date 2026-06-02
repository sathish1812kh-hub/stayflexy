import { ZodError } from "zod";
import { ValidationError } from "@errors/HttpError";
import { CreateComplianceRequestDto, ComplianceFilterDto, type CreateComplianceRequestDtoType, type ComplianceFilterDtoType } from "../dto";

function wrapZod<T>(fn: () => T): T {
  try { return fn(); }
  catch (e) {
    if (e instanceof ZodError) throw new ValidationError("Validation failed", e.errors.map((x) => ({ field: x.path.join("."), message: x.message })));
    throw e;
  }
}

export function validateCreateComplianceRequest(data: unknown): CreateComplianceRequestDtoType {
  return wrapZod(() => CreateComplianceRequestDto.parse(data)) as CreateComplianceRequestDtoType;
}
export function validateComplianceFilter(data: unknown): ComplianceFilterDtoType {
  return wrapZod(() => ComplianceFilterDto.parse(data)) as ComplianceFilterDtoType;
}
