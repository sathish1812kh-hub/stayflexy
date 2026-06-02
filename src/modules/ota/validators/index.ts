import { ZodError } from "zod";
import { ValidationError } from "@errors/HttpError";
import {
  CreateOTAProviderDto,
  UpdateOTAProviderDto,
  OTAProviderFilterDto,
  CreateOTAMappingDto,
  UpdateOTAMappingDto,
  OTAMappingFilterDto,
  OTAReservationFilterDto,
  IngestReservationDto,
  type CreateOTAProviderDtoType,
  type UpdateOTAProviderDtoType,
  type OTAProviderFilterDtoType,
  type CreateOTAMappingDtoType,
  type UpdateOTAMappingDtoType,
  type OTAMappingFilterDtoType,
  type OTAReservationFilterDtoType,
  type IngestReservationDtoType,
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

export function validateCreateOTAProvider(data: unknown): CreateOTAProviderDtoType {
  return wrapZod(() => CreateOTAProviderDto.parse(data)) as CreateOTAProviderDtoType;
}

export function validateUpdateOTAProvider(data: unknown): UpdateOTAProviderDtoType {
  return wrapZod(() => UpdateOTAProviderDto.parse(data)) as UpdateOTAProviderDtoType;
}

export function validateOTAProviderFilter(data: unknown): OTAProviderFilterDtoType {
  return wrapZod(() => OTAProviderFilterDto.parse(data)) as OTAProviderFilterDtoType;
}

export function validateCreateOTAMapping(data: unknown): CreateOTAMappingDtoType {
  return wrapZod(() => CreateOTAMappingDto.parse(data)) as CreateOTAMappingDtoType;
}

export function validateUpdateOTAMapping(data: unknown): UpdateOTAMappingDtoType {
  return wrapZod(() => UpdateOTAMappingDto.parse(data)) as UpdateOTAMappingDtoType;
}

export function validateOTAMappingFilter(data: unknown): OTAMappingFilterDtoType {
  return wrapZod(() => OTAMappingFilterDto.parse(data)) as OTAMappingFilterDtoType;
}

export function validateOTAReservationFilter(data: unknown): OTAReservationFilterDtoType {
  return wrapZod(() => OTAReservationFilterDto.parse(data)) as OTAReservationFilterDtoType;
}

export function validateIngestReservation(data: unknown): IngestReservationDtoType {
  return wrapZod(() => IngestReservationDto.parse(data)) as IngestReservationDtoType;
}
