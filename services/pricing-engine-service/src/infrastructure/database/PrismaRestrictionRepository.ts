import type { PrismaClient, Prisma } from '@prisma/client'
import { buildPaginationMeta } from '@stayflexi/shared-types'
import type { PaginatedResult } from '@stayflexi/shared-types'
import { fromPrismaError } from '@stayflexi/shared-errors'
import { Restriction } from '../../domain/entities/Restriction'
import type { RestrictionProps } from '../../domain/entities/Restriction'
import type {
  IRestrictionRepository,
  CreateRestrictionData,
  UpdateRestrictionData,
  RestrictionFilter,
} from '../../domain/repositories/IRestrictionRepository'

type PrismaRestriction = Prisma.RestrictionGetPayload<Record<string, never>>

function toDomain(raw: PrismaRestriction): Restriction {
  return new Restriction({
    id: (raw as unknown as RestrictionProps).id,
    organizationId: (raw as unknown as RestrictionProps).organizationId,
    hotelId: (raw as unknown as RestrictionProps).hotelId,
    ratePlanId: (raw as unknown as RestrictionProps).ratePlanId ?? null,
    roomTypeId: (raw as unknown as RestrictionProps).roomTypeId ?? null,
    restrictionDate: (raw as unknown as RestrictionProps).restrictionDate,
    minStay: (raw as unknown as RestrictionProps).minStay ?? null,
    maxStay: (raw as unknown as RestrictionProps).maxStay ?? null,
    closedToArrival: (raw as unknown as RestrictionProps).closedToArrival,
    closedToDeparture: (raw as unknown as RestrictionProps).closedToDeparture,
    isActive: (raw as unknown as RestrictionProps).isActive,
    createdAt: (raw as unknown as RestrictionProps).createdAt,
    updatedAt: (raw as unknown as RestrictionProps).updatedAt,
  })
}

export class PrismaRestrictionRepository implements IRestrictionRepository {
  constructor(private readonly db: PrismaClient) {}
  private get delegate(): {
    findUnique: (a: unknown) => Promise<PrismaRestriction | null>
    findMany: (a: unknown) => Promise<PrismaRestriction[]>
    count: (a: unknown) => Promise<number>
    create: (a: unknown) => Promise<PrismaRestriction>
    update: (a: unknown) => Promise<PrismaRestriction>
    delete: (a: unknown) => Promise<PrismaRestriction>
  } {
    return (this.db as unknown as Record<string, unknown>)['restriction'] as unknown as {
      findUnique: (a: unknown) => Promise<PrismaRestriction | null>
      findMany: (a: unknown) => Promise<PrismaRestriction[]>
      count: (a: unknown) => Promise<number>
      create: (a: unknown) => Promise<PrismaRestriction>
      update: (a: unknown) => Promise<PrismaRestriction>
      delete: (a: unknown) => Promise<PrismaRestriction>
    }
  }

  async findById(id: string): Promise<Restriction | null> {
    try {
      const r = await this.delegate.findUnique({ where: { id } })
      return r ? toDomain(r) : null
    } catch (e) {
      const m = fromPrismaError(e)
      if (m) throw m
      throw e
    }
  }
  async create(data: CreateRestrictionData): Promise<Restriction> {
    try {
      const r = await this.delegate.create({ data })
      return toDomain(r)
    } catch (e) {
      const m = fromPrismaError(e)
      if (m) throw m
      throw e
    }
  }
  async update(id: string, data: UpdateRestrictionData): Promise<Restriction> {
    try {
      const r = await this.delegate.update({ where: { id }, data })
      return toDomain(r)
    } catch (e) {
      const m = fromPrismaError(e)
      if (m) throw m
      throw e
    }
  }
  async delete(id: string): Promise<void> {
    try {
      await this.delegate.delete({ where: { id } })
    } catch (e) {
      const m = fromPrismaError(e)
      if (m) throw m
      throw e
    }
  }
  async findMany(
    organizationId: string,
    filter: RestrictionFilter,
  ): Promise<PaginatedResult<Restriction>> {
    const where: Record<string, unknown> = { organizationId }
    if (filter.hotelId) where['hotelId'] = filter.hotelId
    if (filter.ratePlanId) where['ratePlanId'] = filter.ratePlanId
    if (filter.roomTypeId) where['roomTypeId'] = filter.roomTypeId
    if (filter.restrictionDate) where['restrictionDate'] = filter.restrictionDate
    const [rows, total] = await Promise.all([
      this.delegate.findMany({
        where,
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
        orderBy: { restrictionDate: 'asc' },
      }),
      this.delegate.count({ where }),
    ])
    return { data: rows.map(toDomain), meta: buildPaginationMeta(total, filter.page, filter.limit) }
  }
  async findByDate(hotelId: string, date: Date): Promise<Restriction[]> {
    const rows = await this.delegate.findMany({
      where: { hotelId, restrictionDate: date, isActive: true },
    })
    return rows.map(toDomain)
  }
}
