// FILE: src/modules/organization/repositories/PrismaOrgRepository.ts
import { Prisma } from "@prisma/client";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import { OrgRepository, type OrgFindManyParams } from "./index";
import type {
  Organization,
  OrgStatus,
  CreateOrganizationData,
  UpdateOrganizationData,
} from "../types";

type PrismaOrg = Prisma.OrganizationGetPayload<Record<string, never>>;

export class PrismaOrgRepository extends OrgRepository {
  private toOrg(r: PrismaOrg): Organization {
    return {
      id: r.id,
      name: r.name,
      legalName: r.legalName ?? null,
      slug: r.slug,
      plan: r.plan as Organization["plan"],
      status: r.status as Organization["status"],
      ownerId: r.ownerId,
      email: r.email,
      phone: r.phone ?? null,
      website: r.website ?? null,
      logoUrl: r.logoUrl ?? null,
      address: {
        street: r.addressLine1 ?? "",
        city: r.city ?? "",
        state: r.state ?? "",
        country: r.country,
        postalCode: r.postalCode ?? "",
      },
      maxHotels: r.maxHotels,
       
      metadata: r.metadata != null ? (r.metadata as Record<string, unknown>) : null,
      createdById: r.createdById ?? null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      deletedAt: r.deletedAt ?? null,
    };
  }

  async findById(id: string): Promise<Nullable<Organization>> {
    const r = await this.db.organization.findFirst({
      where: { id, deletedAt: null },
    });
    return r ? this.toOrg(r) : null;
  }

  async findBySlug(slug: string): Promise<Nullable<Organization>> {
    const r = await this.db.organization.findFirst({
      where: { slug, deletedAt: null },
    });
    return r ? this.toOrg(r) : null;
  }

  async findMany(params: OrgFindManyParams): Promise<PaginatedResult<Organization>> {
    const skip = this.buildSkip(params);
    const where: Prisma.OrganizationWhereInput = { deletedAt: null };

    if (params.where?.status) {
      where.status = params.where.status as Prisma.EnumOrgStatusFilter;
    }
    if (params.where?.search) {
      where.name = { contains: params.where.search, mode: "insensitive" };
    }

    const [records, total] = await Promise.all([
      this.db.organization.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.organization.count({ where }),
    ]);

    return {
      data: records.map((r) => this.toOrg(r)),
      meta: this.buildPaginationMeta(total, params),
    };
  }

  async create(data: CreateOrganizationData): Promise<Organization> {
    const metadataValue: Prisma.InputJsonValue | undefined =
      data.metadata != null
        ? (data.metadata as Prisma.InputJsonValue)
        : undefined;

    const r = await this.db.organization.create({
      data: {
        name: data.name,
        legalName: data.legalName ?? undefined,
        slug: data.slug,
        plan: data.plan as Prisma.OrganizationCreateInput["plan"],
        status: data.status as Prisma.OrganizationCreateInput["status"],
        ownerId: data.ownerId,
        email: data.email,
        phone: data.phone ?? undefined,
        website: data.website ?? undefined,
        logoUrl: data.logoUrl ?? undefined,
        addressLine1: data.address.street || undefined,
        city: data.address.city || undefined,
        state: data.address.state || undefined,
        country: data.address.country,
        postalCode: data.address.postalCode || undefined,
        maxHotels: data.maxHotels,
        metadata: metadataValue,
        createdById: data.createdById ?? undefined,
      },
    });
    return this.toOrg(r);
  }

  async update(id: string, data: UpdateOrganizationData): Promise<Organization> {
    const payload: Prisma.OrganizationUpdateInput = {};

    if (data.name !== undefined) payload.name = data.name;
    if (data.legalName !== undefined) payload.legalName = data.legalName ?? null;
    if (data.slug !== undefined) payload.slug = data.slug;
    if (data.plan !== undefined) {
      payload.plan = data.plan as Prisma.OrganizationUpdateInput["plan"];
    }
    if (data.status !== undefined) {
      payload.status = data.status as Prisma.OrganizationUpdateInput["status"];
    }
    if (data.email !== undefined) payload.email = data.email;
    if (data.phone !== undefined) payload.phone = data.phone ?? null;
    if (data.website !== undefined) payload.website = data.website ?? null;
    if (data.logoUrl !== undefined) payload.logoUrl = data.logoUrl ?? null;
    if (data.maxHotels !== undefined) payload.maxHotels = data.maxHotels;

    if (data.metadata !== undefined) {
      payload.metadata =
        data.metadata != null
          ? (data.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull;
    }

    if (data.address) {
      if (data.address.street !== undefined) payload.addressLine1 = data.address.street;
      if (data.address.city !== undefined) payload.city = data.address.city;
      if (data.address.state !== undefined) payload.state = data.address.state;
      if (data.address.country !== undefined) payload.country = data.address.country;
      if (data.address.postalCode !== undefined) payload.postalCode = data.address.postalCode;
    }

    const r = await this.db.organization.update({ where: { id }, data: payload });
    return this.toOrg(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.organization.delete({ where: { id } });
  }

  async softDelete(id: string): Promise<void> {
    await this.db.organization.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async countByOrganization(ownerId: string): Promise<number> {
    return this.db.organization.count({ where: { ownerId, deletedAt: null } });
  }

  async findByOwner(ownerId: string): Promise<Organization[]> {
    const records = await this.db.organization.findMany({
      where: { ownerId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return records.map((r) => this.toOrg(r));
  }

  async findByStatus(status: OrgStatus, params: PaginationParams): Promise<PaginatedResult<Organization>> {
    const skip = this.buildSkip(params);
    const where: Prisma.OrganizationWhereInput = {
      status: status as Prisma.EnumOrgStatusFilter,
      deletedAt: null,
    };

    const [records, total] = await Promise.all([
      this.db.organization.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.organization.count({ where }),
    ]);

    return {
      data: records.map((r) => this.toOrg(r)),
      meta: this.buildPaginationMeta(total, params),
    };
  }
}
