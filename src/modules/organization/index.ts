// FILE: src/modules/organization/index.ts

// Types
export type {
  Organization,
  OrgMember,
  OrgPlan,
  OrgStatus,
  OrgAddress,
  OrgSettings,
  OrgMemberRole,
  UserRole,
  CreateOrganizationData,
  UpdateOrganizationData,
} from "./types";

// Constants
export {
  ORG_ERRORS,
  ORG_PLANS,
  ORG_STATUSES,
  PLAN_HOTEL_LIMITS,
  PLAN_USER_LIMITS,
  SLUG_REGEX,
  MAX_SLUG_LENGTH,
  MAX_ORG_NAME_LENGTH,
  SYSTEM_ORG_ADMIN_ROLE_NAME,
  VALID_TIMEZONES,
  VALID_CURRENCIES,
  ORG_SETTINGS_DEFAULTS,
} from "./constants";

// DTOs
export {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrgFilterDto,
  InviteMemberDto,
  UpdateMemberDto,
  UpdateOrgStatusDto,
} from "./dto";
export type {
  CreateOrganizationDtoType,
  UpdateOrganizationDtoType,
  OrgFilterDtoType,
  InviteMemberDtoType,
  UpdateMemberDtoType,
  UpdateOrgStatusDtoType,
} from "./dto";

// Validators
export {
  validateCreateOrganization,
  validateUpdateOrganization,
  validateOrgFilter,
  validateInviteMember,
  validateUpdateMember,
  validateUpdateOrgStatus,
  validateTimezone,
} from "./validators";

// Repositories — abstract classes + input types
export { OrgRepository, OrgMemberRepository } from "./repositories";
export type { CreateOrgMemberInput, UpdateOrgMemberInput, OrgFindManyParams } from "./repositories";

// Concrete repositories
export { PrismaOrgRepository } from "./repositories/PrismaOrgRepository";
export { PrismaOrgMemberRepository } from "./repositories/PrismaOrgMemberRepository";

// Service
export { OrganizationService } from "./services";

// Middleware
export { withOrgContext, withOrgParam } from "./middleware";
export type { OrgContext, OrgHandler, OrgParamHandler } from "./middleware";

// Container — singleton instances
export { orgRepo, orgMemberRepo, organizationService } from "./container";

// Controllers & Routes
export { OrganizationController } from "./controllers";
export { createOrganizationRoutes } from "./routes";
