// FILE: src/modules/organization/repositories/PrismaOrgMemberRepository.ts
import type { Prisma } from "@prisma/client";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import { OrgMemberRepository, type CreateOrgMemberInput, type UpdateOrgMemberInput } from "./index";
import type { OrgMember } from "../types";

type PrismaMember = Prisma.OrganizationMemberGetPayload<Record<string, never>>;

export class PrismaOrgMemberRepository extends OrgMemberRepository {
  private toMember(r: PrismaMember): OrgMember {
    return {
      id: r.id,
      organizationId: r.organizationId,
      userId: r.userId,
      // OrganizationMember has no role column — use isOwner to derive a sensible default
      role: r.isOwner ? "ORG_ADMIN" : "FRONT_DESK",
      isOwner: r.isOwner,
      joinedAt: r.joinedAt,
      removedAt: r.removedAt ?? null,
      createdAt: r.joinedAt,
      updatedAt: r.joinedAt,
    };
  }

  async findById(id: string): Promise<Nullable<OrgMember>> {
    const r = await this.db.organizationMember.findFirst({ where: { id } });
    return r ? this.toMember(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<OrgMember>> {
    const skip = this.buildSkip(params);
    const where: Prisma.OrganizationMemberWhereInput = { removedAt: null };

    const [records, total] = await Promise.all([
      this.db.organizationMember.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { joinedAt: "desc" },
      }),
      this.db.organizationMember.count({ where }),
    ]);

    return {
      data: records.map((r) => this.toMember(r)),
      meta: this.buildPaginationMeta(total, params),
    };
  }

  async create(data: CreateOrgMemberInput): Promise<OrgMember> {
    const r = await this.db.organizationMember.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        isOwner: data.isOwner,
      },
    });
    return this.toMember(r);
  }

  async update(id: string, _data: UpdateOrgMemberInput): Promise<OrgMember> {
    // OrganizationMember schema has no role column; role is on UserRole via RBAC
    // Return the member as-is since there is nothing to update on the record itself
    const r = await this.db.organizationMember.findFirstOrThrow({ where: { id } });
    return this.toMember(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.organizationMember.delete({ where: { id } });
  }

  async findByOrganizationAndUser(
    organizationId: string,
    userId: string
  ): Promise<Nullable<OrgMember>> {
    const r = await this.db.organizationMember.findFirst({
      where: { organizationId, userId },
    });
    return r ? this.toMember(r) : null;
  }

  async findAllByOrganization(
    organizationId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<OrgMember>> {
    const skip = this.buildSkip(params);
    const where: Prisma.OrganizationMemberWhereInput = {
      organizationId,
      removedAt: null,
    };

    const [records, total] = await Promise.all([
      this.db.organizationMember.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { joinedAt: "desc" },
      }),
      this.db.organizationMember.count({ where }),
    ]);

    return {
      data: records.map((r) => this.toMember(r)),
      meta: this.buildPaginationMeta(total, params),
    };
  }

  async findAllByUser(userId: string): Promise<OrgMember[]> {
    const records = await this.db.organizationMember.findMany({
      where: { userId, removedAt: null },
      orderBy: { joinedAt: "desc" },
    });
    return records.map((r) => this.toMember(r));
  }

  async removeMember(id: string): Promise<void> {
    await this.db.organizationMember.update({
      where: { id },
      data: { removedAt: new Date() },
    });
  }
}
