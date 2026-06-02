// FILE: src/modules/organization/dto/index.ts
import { z } from "zod";
import { MAX_ORG_NAME_LENGTH, MAX_SLUG_LENGTH, SLUG_REGEX } from "../constants";

export const CreateOrganizationDto = z.object({
  name: z
    .string()
    .min(1, "Organization name is required")
    .max(MAX_ORG_NAME_LENGTH, `Organization name must not exceed ${MAX_ORG_NAME_LENGTH} characters`)
    .trim(),
  legalName: z.string().min(1).max(300).trim().optional(),
  email: z.string().email("Invalid email address").toLowerCase(),
  phone: z.string().min(5).max(30).trim().optional(),
  website: z.string().url("Invalid website URL").optional(),
  plan: z.enum(["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"]).optional(),
  addressLine1: z.string().min(1).max(255).trim().optional(),
  city: z.string().min(1).max(100).trim().optional(),
  state: z.string().min(1).max(100).trim().optional(),
  country: z.string().length(2).toUpperCase().default("US"),
  postalCode: z.string().min(1).max(20).trim().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateOrganizationDto = z.object({
  name: z
    .string()
    .min(1)
    .max(MAX_ORG_NAME_LENGTH)
    .trim()
    .optional(),
  legalName: z.string().min(1).max(300).trim().nullable().optional(),
  email: z.string().email("Invalid email address").toLowerCase().optional(),
  phone: z.string().min(5).max(30).trim().nullable().optional(),
  website: z.string().url("Invalid website URL").nullable().optional(),
  logoUrl: z.string().url("Invalid logo URL").nullable().optional(),
  addressLine1: z.string().min(1).max(255).trim().nullable().optional(),
  city: z.string().min(1).max(100).trim().nullable().optional(),
  state: z.string().min(1).max(100).trim().nullable().optional(),
  country: z.string().length(2).toUpperCase().optional(),
  postalCode: z.string().min(1).max(20).trim().nullable().optional(),
  slug: z
    .string()
    .min(1)
    .max(MAX_SLUG_LENGTH)
    .regex(SLUG_REGEX, "Slug must contain only lowercase letters, numbers, and hyphens")
    .optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export const OrgFilterDto = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "CANCELLED", "PENDING_SETUP"]).optional(),
  plan: z.enum(["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"]).optional(),
  search: z.string().min(1).max(255).trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const InviteMemberDto = z.object({
  userId: z.string().uuid("userId must be a valid UUID"),
  role: z.enum([
    "ORG_ADMIN",
    "HOTEL_MANAGER",
    "FRONT_DESK",
    "HOUSEKEEPING",
    "ACCOUNTANT",
  ]),
});

export const UpdateMemberDto = z.object({
  role: z.enum([
    "ORG_ADMIN",
    "HOTEL_MANAGER",
    "FRONT_DESK",
    "HOUSEKEEPING",
    "ACCOUNTANT",
  ]),
});

export const UpdateOrgStatusDto = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "CANCELLED", "PENDING_SETUP"]),
  reason: z.string().min(1).max(500).trim().optional(),
});

export type CreateOrganizationDtoType = z.infer<typeof CreateOrganizationDto>;
export type UpdateOrganizationDtoType = z.infer<typeof UpdateOrganizationDto>;
export type OrgFilterDtoType = z.infer<typeof OrgFilterDto>;
export type InviteMemberDtoType = z.infer<typeof InviteMemberDto>;
export type UpdateMemberDtoType = z.infer<typeof UpdateMemberDto>;
export type UpdateOrgStatusDtoType = z.infer<typeof UpdateOrgStatusDto>;
