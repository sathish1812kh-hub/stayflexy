import type { PrismaClient, Prisma } from '@prisma/client'
import { buildPaginationMeta } from '@stayflexi/shared-types'
import type { PaginatedResult } from '@stayflexi/shared-types'
import { fromPrismaError } from '@stayflexi/shared-errors'
import { Season } from '../../domain/entities/Season'
import type { SeasonProps } from '../../domain/entities/Season'
import type {
  ISeasonRepository,
  CreateSeasonData,
  UpdateSeasonData,
  SeasonFilter,
} from '../../domain/repositories/ISeasonRepository'

type PrismaSeason = Prisma.SeasonGetPayload<Record<string, never>>

function toDomain(raw: PrismaSeason): Season {
  return new Season({
    id: (raw as unknown as SeasonProps).id,
    organizationId: (raw as unknown as SeasonProps).organizationId,
    hotelId: (raw as unknown as SeasonProps).hotelId,
    name: (raw as unknown as SeasonProps).name,
    code: (raw as unknown as SeasonProps).code,
    description: (raw as unknown as SeasonProps).description ?? null,
    startDate: (raw as unknown as SeasonProps).startDate,
    endDate: (raw as unknown as SeasonProps).endDate,
    isActive: (raw as unknown as SeasonProps).isActive,
    createdAt: (raw as unknown as SeasonProps).createdAt,
    updatedAt: (raw as unknown as SeasonProps).updatedAt,
    deletedAt: (raw as unknown as SeasonProps).deletedAt ?? null,
  })
}

export class PrismaSeasonRepository implements ISeasonRepository {
  constructor(private readonly db: PrismaClient) {}
  private get delegate(): {
    findUnique: (a: unknown) => Promise<PrismaSeason | null>
    findFirst: (a: unknown) => Promise<PrismaSeason | null>
    findMany: (a: unknown) => Promise<PrismaSeason[]>
    count: (a: unknown) => Promise<number>
    create: (a: unknown) => Promise<PrismaSeason>
    update: (a: unknown) => Promise<PrismaSeason>
  } {
    return (this.db as unknown as Record<string, unknown>)['season'] as unknown as {
      findUnique: (a: unknown) => Promise<PrismaSeason | null>
      findFirst: (a: unknown) => Promise<PrismaSeason | null>
      findMany: (a: unknown) => Promise<PrismaSeason[]>
      count: (a: unknown) => Promise<number>
      create: (a: unknown) => Promise<PrismaSeason>
      update: (a: unknown) => Promise<PrismaSeason>
    }
  }

  async findById(id: string): Promise<Season | null> {
    try {
      const r = await this.delegate.findUnique({ where: { id } })
      return r ? toDomain(r) : null
    } catch (e) {
      const m = fromPrismaError(e)
      if (m) throw m
      throw e
    }
  }
  async findByCode(hotelId: string, code: string): Promise<Season | null> {
    try {
      const r = await this.delegate.findFirst({ where: { hotelId, code, deletedAt: null } })
      return r ? toDomain(r) : null
    } catch (e) {
      const m = fromPrismaError(e)
      if (m) throw m
      throw e
    }
  }
  async create(data: CreateSeasonData): Promise<Season> {
    try {
      const r = await this.delegate.create({ data })
      return toDomain(r)
    } catch (e) {
      const m = fromPrismaError(e)
      if (m) throw m
      throw e
    }
  }
  async update(id: string, data: UpdateSeasonData): Promise<Season> {
    try {
      const r = await this.delegate.update({ where: { id }, data })
      return toDomain(r)
    } catch (e) {
      const m = fromPrismaError(e)
      if (m) throw m
      throw e
    }
  }
  async softDelete(id: string): Promise<void> {
    try {
      await this.delegate.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      })
    } catch (e) {
      const m = fromPrismaError(e)
      if (m) throw m
      throw e
    }
  }
  async findMany(organizationId: string, filter: SeasonFilter): Promise<PaginatedResult<Season>> {
    const where: Record<string, unknown> = { organizationId, deletedAt: null }
    if (filter.hotelId) where['hotelId'] = filter.hotelId
    if (filter.isActive !== undefined) where['isActive'] = filter.isActive
    const [rows, total] = await Promise.all([
      this.delegate.findMany({
        where,
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
        orderBy: { startDate: 'asc' },
      }),
      this.delegate.count({ where }),
    ])
    return { data: rows.map(toDomain), meta: buildPaginationMeta(total, filter.page, filter.limit) }
  }
}
