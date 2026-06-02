import type { PrismaClient, Prisma } from '@prisma/client'
import { getPrismaClient } from '@stayflexi/shared-database'
import { fromPrismaError } from '@stayflexi/shared-errors'
import { buildPaginationMeta } from '@stayflexi/shared-types'
import { Organization } from '../../domain/entities/Organization'
import type { OrganizationProps } from '../../domain/entities/Organization'
import type {
  IOrganizationRepository,
  CreateOrganizationData,
  UpdateOrganizationData,
  OrgFilter,
} from '../../domain/repositories/IOrganizationRepository'
import type { PaginatedResult } from '@stayflexi/shared-types'

// Raw Prisma row shape (non-null version of findUnique result)
type PrismaOrg = Prisma.OrganizationGetPayload<Record<string, never>>

function mapToOrg(raw: PrismaOrg): Organization {
  return new Organization({
    id: raw.id,
    name: raw.name,
    legalName: raw.legalName,
    slug: raw.slug,
    plan: raw.plan as OrganizationProps['plan'],
    status: raw.status as OrganizationProps['status'],
    email: raw.email,
    phone: raw.phone,
    website: raw.website,
    logoUrl: raw.logoUrl,
    ownerId: raw.ownerId,
    country: raw.country,
    maxHotels: raw.maxHotels,
    metadata: raw.metadata as Record<string, unknown> | null,
    createdById: raw.createdById,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    deletedAt: raw.deletedAt,
  })
}

export class PrismaOrganizationRepository implements IOrganizationRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findById(id: string): Promise<Organization | null> {
    try {
      const raw = await this.db.organization.findUnique({ where: { id } })
      return raw ? mapToOrg(raw) : null
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    try {
      const raw = await this.db.organization.findUnique({ where: { slug } })
      return raw ? mapToOrg(raw) : null
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async findByOwnerId(ownerId: string): Promise<Organization | null> {
    try {
      const raw = await this.db.organization.findFirst({
        where: { ownerId, deletedAt: null },
      })
      return raw ? mapToOrg(raw) : null
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async create(data: CreateOrganizationData): Promise<Organization> {
    try {
      const raw = await this.db.organization.create({
        data: {
          name: data.name,
          legalName: data.legalName ?? null,
          slug: data.slug,
          plan: 'FREE',
          status: 'PENDING_SETUP',
          email: data.email,
          phone: data.phone ?? null,
          website: data.website ?? null,
          country: data.country,
          ownerId: data.ownerId,
          createdById: data.createdById ?? null,
        },
      })
      return mapToOrg(raw)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async update(id: string, data: UpdateOrganizationData): Promise<Organization> {
    try {
      const raw = await this.db.organization.update({
        where: { id },
        data,
      })
      return mapToOrg(raw)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async setOwner(id: string, newOwnerId: string): Promise<Organization> {
    try {
      const raw = await this.db.organization.update({
        where: { id },
        data: { ownerId: newOwnerId },
      })
      return mapToOrg(raw)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async softDelete(id: string): Promise<void> {
    await this.db.organization.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'CANCELLED' },
    })
  }

  async findMany(filter: OrgFilter): Promise<PaginatedResult<Organization>> {
    const skip = (filter.page - 1) * filter.limit

    const where: Prisma.OrganizationWhereInput = {
      deletedAt: null,
      ...(filter.ownerId !== undefined && { ownerId: filter.ownerId }),
      ...(filter.status !== undefined && {
        status: filter.status as OrganizationProps['status'],
      }),
      ...(filter.plan !== undefined && {
        plan: filter.plan as OrganizationProps['plan'],
      }),
    }

    const [records, total] = await Promise.all([
      this.db.organization.findMany({
        where,
        skip,
        take: filter.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.organization.count({ where }),
    ])

    return {
      data: records.map(mapToOrg),
      meta: buildPaginationMeta(total, filter.page, filter.limit),
    }
  }
}
