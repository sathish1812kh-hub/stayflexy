import type { PrismaClient, Prisma } from '@prisma/client'
import { buildPaginationMeta } from '@stayflexi/shared-types'
import type { PaginatedResult } from '@stayflexi/shared-types'
import { fromPrismaError } from '@stayflexi/shared-errors'
import { NightAudit } from '../../domain/entities/NightAudit'
import type { NightAuditProps } from '../../domain/entities/NightAudit'
import type {
  INightAuditRepository,
  CreateNightAuditData,
  NightAuditFilter,
} from '../../domain/repositories/INightAuditRepository'

type PrismaNightAudit = Prisma.NightAuditGetPayload<Record<string, never>>

function toDomain(raw: PrismaNightAudit): NightAudit {
  const r = raw as unknown as NightAuditProps & {
    totalRevenue: unknown
    totalPayments: unknown
    entries: unknown
  }
  return new NightAudit({
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    auditDate: r.auditDate,
    status: r.status,
    closedById: r.closedById ?? null,
    entries: (r.entries as Record<string, unknown> | null) ?? null,
    totalRevenue:
      r.totalRevenue !== null && r.totalRevenue !== undefined ? Number(r.totalRevenue) : null,
    totalPayments:
      r.totalPayments !== null && r.totalPayments !== undefined ? Number(r.totalPayments) : null,
    folioCount: r.folioCount,
    startedAt: (r as unknown as { startedAt: Date | null }).startedAt ?? null,
    completedAt: (r as unknown as { completedAt: Date | null }).completedAt ?? null,
    errorMessage: r.errorMessage ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  })
}

export class PrismaNightAuditRepository implements INightAuditRepository {
  constructor(private readonly db: PrismaClient) {}

  private get delegate(): {
    findUnique: (a: unknown) => Promise<PrismaNightAudit | null>
    findFirst: (a: unknown) => Promise<PrismaNightAudit | null>
    findMany: (a: unknown) => Promise<PrismaNightAudit[]>
    count: (a: unknown) => Promise<number>
    create: (a: unknown) => Promise<PrismaNightAudit>
    update: (a: unknown) => Promise<PrismaNightAudit>
  } {
    return (this.db as unknown as Record<string, unknown>)['nightAudit'] as unknown as {
      findUnique: (a: unknown) => Promise<PrismaNightAudit | null>
      findFirst: (a: unknown) => Promise<PrismaNightAudit | null>
      findMany: (a: unknown) => Promise<PrismaNightAudit[]>
      count: (a: unknown) => Promise<number>
      create: (a: unknown) => Promise<PrismaNightAudit>
      update: (a: unknown) => Promise<PrismaNightAudit>
    }
  }

  async findById(id: string): Promise<NightAudit | null> {
    try {
      const r = await this.delegate.findUnique({ where: { id } })
      return r ? toDomain(r) : null
    } catch (e) {
      const m = fromPrismaError(e)
      if (m) throw m
      throw e
    }
  }

  async findByHotelAndDate(hotelId: string, auditDate: Date): Promise<NightAudit | null> {
    try {
      const r = await this.delegate.findFirst({ where: { hotelId, auditDate } })
      return r ? toDomain(r) : null
    } catch (e) {
      const m = fromPrismaError(e)
      if (m) throw m
      throw e
    }
  }

  async create(data: CreateNightAuditData): Promise<NightAudit> {
    try {
      const r = await this.delegate.create({ data })
      return toDomain(r)
    } catch (e) {
      const m = fromPrismaError(e)
      if (m) throw m
      throw e
    }
  }

  async updateStatus(
    id: string,
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED',
    extra: Record<string, unknown> = {},
  ): Promise<NightAudit> {
    try {
      const r = await this.delegate.update({ where: { id }, data: { status, ...extra } })
      return toDomain(r)
    } catch (e) {
      const m = fromPrismaError(e)
      if (m) throw m
      throw e
    }
  }

  async findMany(
    organizationId: string,
    filter: NightAuditFilter,
  ): Promise<PaginatedResult<NightAudit>> {
    const where: Record<string, unknown> = { organizationId }
    if (filter.hotelId) where['hotelId'] = filter.hotelId
    if (filter.status) where['status'] = filter.status
    const [rows, total] = await Promise.all([
      this.delegate.findMany({
        where,
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
        orderBy: { auditDate: 'desc' },
      }),
      this.delegate.count({ where }),
    ])
    return { data: rows.map(toDomain), meta: buildPaginationMeta(total, filter.page, filter.limit) }
  }
}
