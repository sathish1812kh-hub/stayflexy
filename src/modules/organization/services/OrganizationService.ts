// FILE: src/modules/organization/services/OrganizationService.ts
import { BaseService } from "@lib/baseService";
import { prisma } from "@lib/prisma";
import { NotFoundError, ConflictError, BadRequestError, ForbiddenError } from "@errors/HttpError";
import type { IOrganizationService, OrganizationSummary } from "@common/contracts/IOrganizationService";
import type { IAuditService, AuditContext } from "@common/contracts/IAuditService";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type { OrgRepository, OrgMemberRepository } from "../repositories";
import type {
  Organization,
  OrgMember,
  OrgStatus,
  OrgPlan,
  OrgSettings,
  CreateOrganizationData,
  UpdateOrganizationData,
} from "../types";
import type {
  CreateOrganizationDtoType,
  UpdateOrganizationDtoType,
  InviteMemberDtoType,
} from "../dto";
import {
  ORG_ERRORS,
  PLAN_HOTEL_LIMITS,
  SLUG_REGEX,
  MAX_SLUG_LENGTH,
  ORG_SETTINGS_DEFAULTS,
} from "../constants";

/** Loose filter type accepted by listOrganizations — also accepts plain strings from route queries */
export interface OrgListFilter {
  status?: string;
  plan?: string;
  search?: string;
  page: number;
  limit: number;
}

const NOOP_AUDIT_CONTEXT: AuditContext = {
  userId: "system",
  organizationId: "system",
  ipAddress: "0.0.0.0",
  userAgent: "system",
};

export class OrganizationService extends BaseService implements IOrganizationService {
  protected readonly moduleName = "OrganizationService";

  constructor(
    private readonly orgRepo: OrgRepository,
    private readonly orgMemberRepo: OrgMemberRepository,
    private readonly auditService: IAuditService
  ) {
    super();
  }

  // ─── IOrganizationService implementation ──────────────────────────────────────

  async findById(id: string): Promise<Nullable<OrganizationSummary>> {
    return this.execute("findById", async () => {
      const org = await this.orgRepo.findById(id);
      return org ? this.toOrgSummary(org) : null;
    });
  }

  async findBySlug(slug: string): Promise<Nullable<OrganizationSummary>> {
    return this.execute("findBySlug", async () => {
      const org = await this.orgRepo.findBySlug(slug);
      return org ? this.toOrgSummary(org) : null;
    });
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<OrganizationSummary>> {
    return this.execute("findMany", async () => {
      const result = await this.orgRepo.findMany(params);
      return {
        data: result.data.map((o) => this.toOrgSummary(o)),
        meta: result.meta,
      };
    });
  }

  async validateMembership(userId: string, organizationId: string): Promise<boolean> {
    return this.execute("validateMembership", async () => {
      const member = await this.orgMemberRepo.findByOrganizationAndUser(organizationId, userId);
      return member !== null && member.removedAt === null;
    });
  }

  async getHotelIds(organizationId: string): Promise<string[]> {
    return this.execute("getHotelIds", async () => {
      const hotels = await prisma.hotel.findMany({
        where: { organizationId, deletedAt: null },
        select: { id: true },
      });
      return hotels.map((h) => h.id);
    });
  }

  // ─── Organization CRUD ────────────────────────────────────────────────────────

  async createOrganization(
    dto: CreateOrganizationDtoType,
    createdById: string,
    auditContext: AuditContext = NOOP_AUDIT_CONTEXT
  ): Promise<Organization> {
    return this.execute("createOrganization", async () => {
      const plan: OrgPlan = (dto.plan as OrgPlan | undefined) ?? "FREE";
      const maxHotels = PLAN_HOTEL_LIMITS[plan];
      const baseSlug = this.generateSlug(dto.name);
      const slug = await this.ensureUniqueSlug(baseSlug);

      const createData: CreateOrganizationData = {
        name: dto.name,
        legalName: dto.legalName ?? null,
        slug,
        plan,
        status: "PENDING_SETUP",
        ownerId: createdById,
        email: dto.email,
        phone: dto.phone ?? null,
        website: dto.website ?? null,
        logoUrl: null,
        address: {
          street: dto.addressLine1 ?? "",
          city: dto.city ?? "",
          state: dto.state ?? "",
          country: dto.country,
          postalCode: dto.postalCode ?? "",
        },
        maxHotels,
        metadata: dto.metadata ?? null,
        createdById,
      };

      const org = await this.orgRepo.create(createData);

      await this.orgMemberRepo.create({
        organizationId: org.id,
        userId: createdById,
        role: "ORG_ADMIN",
        isOwner: true,
      });

      await this.auditService.record(
        "ORGANIZATION_CREATED",
        "Organization",
        org.id,
        auditContext,
        null,
        org
      );

      return org;
    });
  }

  async updateOrganization(
    id: string,
    dto: UpdateOrganizationDtoType,
    requesterId: string,
    auditContext: AuditContext = NOOP_AUDIT_CONTEXT
  ): Promise<Organization> {
    return this.execute("updateOrganization", async () => {
      const existing = await this.orgRepo.findById(id);
      if (!existing) throw new NotFoundError(ORG_ERRORS.NOT_FOUND);

      const isMember = await this.orgMemberRepo.findByOrganizationAndUser(id, requesterId);
      if (!isMember) {
        throw new ForbiddenError("You are not a member of this organization");
      }

      if (dto.slug) {
        if (!SLUG_REGEX.test(dto.slug)) {
          throw new BadRequestError(ORG_ERRORS.INVALID_SLUG);
        }
        if (dto.slug.length > MAX_SLUG_LENGTH) {
          throw new BadRequestError(ORG_ERRORS.SLUG_TOO_LONG);
        }
        if (dto.slug !== existing.slug) {
          const slugConflict = await this.orgRepo.findBySlug(dto.slug);
          if (slugConflict) throw new ConflictError(ORG_ERRORS.SLUG_TAKEN);
        }
      }

      const updateData: UpdateOrganizationData = {
        name: dto.name,
        legalName: dto.legalName,
        slug: dto.slug,
        email: dto.email,
        phone: dto.phone,
        website: dto.website,
        logoUrl: dto.logoUrl,
        metadata: dto.metadata,
      };

      if (
        dto.addressLine1 !== undefined ||
        dto.city !== undefined ||
        dto.state !== undefined ||
        dto.country !== undefined ||
        dto.postalCode !== undefined
      ) {
        updateData.address = {
          street: dto.addressLine1 ?? undefined,
          city: dto.city ?? undefined,
          state: dto.state ?? undefined,
          country: dto.country,
          postalCode: dto.postalCode ?? undefined,
        };
      }

      const updated = await this.orgRepo.update(id, updateData);

      await this.auditService.record(
        "ORGANIZATION_UPDATED",
        "Organization",
        id,
        auditContext,
        existing,
        updated
      );

      return updated;
    });
  }

  async deactivateOrganization(
    id: string,
    requesterId: string,
    auditContext: AuditContext = NOOP_AUDIT_CONTEXT
  ): Promise<void> {
    return this.execute("deactivateOrganization", async () => {
      const existing = await this.orgRepo.findById(id);
      if (!existing) throw new NotFoundError(ORG_ERRORS.NOT_FOUND);

      void requesterId; // SUPER_ADMIN only — route guard enforces role

      await this.orgRepo.update(id, { status: "SUSPENDED" });

      await this.auditService.record(
        "ORGANIZATION_DEACTIVATED",
        "Organization",
        id,
        auditContext,
        existing,
        { ...existing, status: "SUSPENDED" }
      );
    });
  }

  async deleteOrganization(
    id: string,
    auditContext: AuditContext = NOOP_AUDIT_CONTEXT
  ): Promise<void> {
    return this.execute("deleteOrganization", async () => {
      const existing = await this.orgRepo.findById(id);
      if (!existing) throw new NotFoundError(ORG_ERRORS.NOT_FOUND);

      await this.orgRepo.softDelete(id);

      await this.auditService.record(
        "ORGANIZATION_DELETED",
        "Organization",
        id,
        auditContext,
        existing,
        null
      );
    });
  }

  // ─── Listing ──────────────────────────────────────────────────────────────────

  async listOrganizations(filter: OrgListFilter): Promise<PaginatedResult<Organization>> {
    return this.execute("listOrganizations", async () => {
      const params = this.buildPaginationParams(filter.page, filter.limit);
      return this.orgRepo.findMany({
        ...params,
        where: {
          status: filter.status as OrgStatus | undefined,
          search: filter.search,
        },
      });
    });
  }

  // ─── Settings ─────────────────────────────────────────────────────────────────

  async getOrgSettings(id: string): Promise<OrgSettings> {
    return this.execute("getOrgSettings", async () => {
      const org = await this.orgRepo.findById(id);
      if (!org) throw new NotFoundError(ORG_ERRORS.NOT_FOUND);

      const meta = org.metadata ?? {};
      return {
        timezone: typeof meta["timezone"] === "string" ? meta["timezone"] : ORG_SETTINGS_DEFAULTS.timezone,
        currency: typeof meta["currency"] === "string" ? meta["currency"] : ORG_SETTINGS_DEFAULTS.currency,
        dateFormat: typeof meta["dateFormat"] === "string" ? meta["dateFormat"] : ORG_SETTINGS_DEFAULTS.dateFormat,
        timeFormat:
          meta["timeFormat"] === "12h" || meta["timeFormat"] === "24h"
            ? meta["timeFormat"]
            : ORG_SETTINGS_DEFAULTS.timeFormat,
        language: typeof meta["language"] === "string" ? meta["language"] : ORG_SETTINGS_DEFAULTS.language,
        checkInTime: typeof meta["checkInTime"] === "string" ? meta["checkInTime"] : ORG_SETTINGS_DEFAULTS.checkInTime,
        checkOutTime: typeof meta["checkOutTime"] === "string" ? meta["checkOutTime"] : ORG_SETTINGS_DEFAULTS.checkOutTime,
      };
    });
  }

  async updateOrgSettings(
    id: string,
    settings: Partial<OrgSettings>,
    auditContext: AuditContext = NOOP_AUDIT_CONTEXT
  ): Promise<OrgSettings> {
    return this.execute("updateOrgSettings", async () => {
      const org = await this.orgRepo.findById(id);
      if (!org) throw new NotFoundError(ORG_ERRORS.NOT_FOUND);

      const currentMeta = org.metadata ?? {};
      const updatedMeta: Record<string, unknown> = {
        ...currentMeta,
        ...settings,
      };

      await this.orgRepo.update(id, { metadata: updatedMeta });

      await this.auditService.record(
        "ORGANIZATION_SETTINGS_UPDATED",
        "Organization",
        id,
        auditContext,
        { metadata: currentMeta },
        { metadata: updatedMeta }
      );

      return this.getOrgSettings(id);
    });
  }

  // ─── Members ──────────────────────────────────────────────────────────────────

  async getMembers(
    organizationId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<OrgMember>> {
    return this.execute("getMembers", async () => {
      const org = await this.orgRepo.findById(organizationId);
      if (!org) throw new NotFoundError(ORG_ERRORS.NOT_FOUND);
      return this.orgMemberRepo.findAllByOrganization(organizationId, params);
    });
  }

  async addMember(
    orgId: string,
    userId: string,
    role: OrgMember["role"],
    addedById: string,
    auditContext: AuditContext = NOOP_AUDIT_CONTEXT
  ): Promise<OrgMember> {
    return this.execute("addMember", async () => {
      const org = await this.orgRepo.findById(orgId);
      if (!org) throw new NotFoundError(ORG_ERRORS.NOT_FOUND);
      if (org.status === "SUSPENDED") throw new BadRequestError(ORG_ERRORS.SUSPENDED);
      if (org.status === "CANCELLED") throw new BadRequestError(ORG_ERRORS.CANCELLED);

      const existing = await this.orgMemberRepo.findByOrganizationAndUser(orgId, userId);
      if (existing && existing.removedAt === null) {
        throw new ConflictError(ORG_ERRORS.MEMBER_ALREADY_EXISTS);
      }

      void addedById; // tracked via auditContext

      const member = await this.orgMemberRepo.create({
        organizationId: orgId,
        userId,
        role,
        isOwner: false,
      });

      await this.auditService.record(
        "MEMBER_ADDED",
        "OrgMember",
        member.id,
        auditContext,
        null,
        member
      );

      return member;
    });
  }

  async inviteMember(
    organizationId: string,
    dto: InviteMemberDtoType,
    auditContext: AuditContext = NOOP_AUDIT_CONTEXT
  ): Promise<OrgMember> {
    return this.execute("inviteMember", async () => {
      const org = await this.orgRepo.findById(organizationId);
      if (!org) throw new NotFoundError(ORG_ERRORS.NOT_FOUND);
      if (org.status === "SUSPENDED") throw new BadRequestError(ORG_ERRORS.SUSPENDED);
      if (org.status === "CANCELLED") throw new BadRequestError(ORG_ERRORS.CANCELLED);

      const existing = await this.orgMemberRepo.findByOrganizationAndUser(
        organizationId,
        dto.userId
      );
      if (existing && existing.removedAt === null) {
        throw new ConflictError(ORG_ERRORS.MEMBER_ALREADY_EXISTS);
      }

      const member = await this.orgMemberRepo.create({
        organizationId,
        userId: dto.userId,
        role: dto.role as OrgMember["role"],
        isOwner: false,
      });

      await this.auditService.record(
        "MEMBER_INVITED",
        "OrgMember",
        member.id,
        auditContext,
        null,
        member
      );

      return member;
    });
  }

  async removeMember(
    organizationId: string,
    userId: string,
    auditContext: AuditContext = NOOP_AUDIT_CONTEXT
  ): Promise<void> {
    return this.execute("removeMember", async () => {
      const member = await this.orgMemberRepo.findByOrganizationAndUser(organizationId, userId);
      if (!member || member.removedAt !== null) {
        throw new NotFoundError(ORG_ERRORS.MEMBER_NOT_FOUND);
      }
      if (member.isOwner) throw new BadRequestError(ORG_ERRORS.CANNOT_REMOVE_OWNER);

      await this.orgMemberRepo.removeMember(member.id);

      await this.auditService.record(
        "MEMBER_REMOVED",
        "OrgMember",
        member.id,
        auditContext,
        member,
        null
      );
    });
  }

  // ─── Mapping helpers ──────────────────────────────────────────────────────────

  toOrgSummary(org: Organization): OrganizationSummary {
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      status: org.status,
      hotelCount: 0, // resolved from HotelService at query time
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, MAX_SLUG_LENGTH);
  }

  private async ensureUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let attempt = 0;
    while (true) {
      const existing = await this.orgRepo.findBySlug(slug);
      if (!existing) return slug;
      attempt++;
      const suffix = `-${attempt}`;
      slug = baseSlug.slice(0, MAX_SLUG_LENGTH - suffix.length) + suffix;
    }
  }
}
