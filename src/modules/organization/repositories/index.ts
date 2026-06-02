// FILE: src/modules/organization/repositories/index.ts
import { BaseRepository } from "@lib/baseRepository";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type { UserRole } from "../types";
import type {
  Organization,
  OrgMember,
  OrgStatus,
  CreateOrganizationData,
  UpdateOrganizationData,
} from "../types";

export interface OrgFindManyParams extends PaginationParams {
  where?: {
    status?: OrgStatus;
    search?: string;
  };
}

export abstract class OrgRepository extends BaseRepository<
  Organization,
  CreateOrganizationData,
  UpdateOrganizationData
> {
  abstract override findById(id: string): Promise<Nullable<Organization>>;

  abstract override findMany(params: OrgFindManyParams): Promise<PaginatedResult<Organization>>;

  abstract override create(data: CreateOrganizationData): Promise<Organization>;

  abstract override update(id: string, data: UpdateOrganizationData): Promise<Organization>;

  abstract override hardDelete(id: string): Promise<void>;

  abstract findBySlug(slug: string): Promise<Nullable<Organization>>;

  abstract findByOwner(ownerId: string): Promise<Organization[]>;

  abstract findByStatus(status: OrgStatus, params: PaginationParams): Promise<PaginatedResult<Organization>>;

  abstract softDelete(id: string): Promise<void>;

  abstract countByOrganization(ownerId: string): Promise<number>;
}

export interface CreateOrgMemberInput {
  organizationId: string;
  userId: string;
  role: UserRole;
  isOwner: boolean;
}

export interface UpdateOrgMemberInput {
  role: UserRole;
}

export abstract class OrgMemberRepository extends BaseRepository<
  OrgMember,
  CreateOrgMemberInput,
  UpdateOrgMemberInput
> {
  abstract override findById(id: string): Promise<Nullable<OrgMember>>;

  abstract override findMany(params: PaginationParams): Promise<PaginatedResult<OrgMember>>;

  abstract override create(data: CreateOrgMemberInput): Promise<OrgMember>;

  abstract override update(id: string, data: UpdateOrgMemberInput): Promise<OrgMember>;

  abstract override hardDelete(id: string): Promise<void>;

  abstract findByOrganizationAndUser(organizationId: string, userId: string): Promise<Nullable<OrgMember>>;

  abstract findAllByOrganization(
    organizationId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<OrgMember>>;

  abstract findAllByUser(userId: string): Promise<OrgMember[]>;

  abstract removeMember(id: string): Promise<void>;
}
