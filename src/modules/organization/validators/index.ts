// FILE: src/modules/organization/validators/index.ts
import { ZodError } from "zod";
import { ValidationError } from "@errors/HttpError";
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrgFilterDto,
  InviteMemberDto,
  UpdateMemberDto,
  UpdateOrgStatusDto,
  type CreateOrganizationDtoType,
  type UpdateOrganizationDtoType,
  type OrgFilterDtoType,
  type InviteMemberDtoType,
  type UpdateMemberDtoType,
  type UpdateOrgStatusDtoType,
} from "../dto";

function parseOrThrow<T>(schema: { parse: (data: unknown) => T }, data: unknown): T {
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

export function validateCreateOrganization(data: unknown): CreateOrganizationDtoType {
  return parseOrThrow(CreateOrganizationDto, data);
}

export function validateUpdateOrganization(data: unknown): UpdateOrganizationDtoType {
  return parseOrThrow(UpdateOrganizationDto, data);
}

export function validateOrgFilter(data: unknown): OrgFilterDtoType {
  return parseOrThrow(OrgFilterDto, data);
}

export function validateInviteMember(data: unknown): InviteMemberDtoType {
  return parseOrThrow(InviteMemberDto, data);
}

export function validateUpdateMember(data: unknown): UpdateMemberDtoType {
  return parseOrThrow(UpdateMemberDto, data);
}

export function validateUpdateOrgStatus(data: unknown): UpdateOrgStatusDtoType {
  return parseOrThrow(UpdateOrgStatusDto, data);
}

export function validateTimezone(tz: string): boolean {
  try {
    return Intl.supportedValuesOf("timeZone").includes(tz);
  } catch {
    // Intl.supportedValuesOf may not be available in all environments
    return false;
  }
}
