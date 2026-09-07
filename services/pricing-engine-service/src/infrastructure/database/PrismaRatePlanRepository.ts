import type { PrismaClient, Prisma } from '@prisma/client'
import { buildPaginationMeta } from '@stayflexi/shared-types'
import type { PaginatedResult } from '@stayflexi/shared-types'
import { fromPrismaError } from '@stayflexi/shared-errors'
import { RatePlan } from '../../domain/entities/RatePlan'
import type { RatePlanProps } from '../../domain/entities/RatePlan'
import type {
  IRatePlanRepository,
  CreateRatePlanData,
  UpdateRatePlanData,
  RatePlanFilter,
} from '../../domain/repositories/IRatePlanRepository'

type PrismaRatePlan = Prisma.RatePlanGetPayload<Record<string, never>>

function toDomain(raw: PrismaRatePlan): RatePlan {
  return new RatePlan({
    id: (raw as unknown as RatePlanProps).id,
    organizationId: (raw as unknown as RatePlanProps).organizationId,
    hotelId: (raw as unknown as RatePlanProps).hotelId,
    roomTypeId: (raw as unknown as RatePlanProps).roomTypeId ?? null,
    name: (raw as unknown as RatePlanProps).name,
    code: (raw as unknown as RatePlanProps).code,
    description: (raw as unknown as RatePlanProps).description ?? null,
    seasonStart: (raw as unknown as RatePlanProps).seasonStart ?? null,
    seasonEnd: (raw as unknown as RatePlanProps).seasonEnd ?? null,
    baseRate: Number((raw as unknown as { baseRate: unknown }).baseRate),
    currency: (raw as unknown as RatePlanProps).currency,
    minStay: (raw as unknown as RatePlanProps).minStay,
    maxStay: (raw as unknown as RatePlanProps).maxStay ?? null,
    closedToArrival: (raw as unknown as RatePlanProps).closedToArrival,
    closedToDeparture: (raw as unknown as RatePlanProps).closedToDeparture,
    isActive: (raw as unknown as RatePlanProps).isActive,
    createdById: (raw as unknown as RatePlanProps).createdById ?? null,
    createdAt: (raw as unknown as RatePlanProps).createdAt,
    updatedAt: (raw as unknown as RatePlanProps).updatedAt,
    deletedAt: (raw as unknown as RatePlanProps).deletedAt ?? null,
  })
}

export class PrismaRatePlanRepository implements IRatePlanRepository {
  constructor(private readonly db: PrismaClient) {}

  private get repo(): PrismaClient['ratePlan' & string] & Record<string, unknown> {
    return (this.db as unknown as Record<string, unknown>)['ratePlan'] as PrismaClient['ratePlan' &
      string] &
      Record<string, unknown>
  }

  private get delegate(): {
    findUnique: (args: unknown) => Promise<PrismaRatePlan | null>
    findFirst: (args: unknown) => Promise<PrismaRatePlan | null>
    findMany: (args: unknown) => Promise<PrismaRatePlan[]>
    count: (args: unknown) => Promise<number>
    create: (args: unknown) => Promise<PrismaRatePlan>
    update: (args: unknown) => Promise<PrismaRatePlan>
  } {
    return this.repo as unknown as {
      findUnique: (args: unknown) => Promise<PrismaRatePlan | null>
      findFirst: (args: unknown) => Promise<PrismaRatePlan | null>
      findMany: (args: unknown) => Promise<PrismaRatePlan[]>
      count: (args: unknown) => Promise<number>
      create: (args: unknown) => Promise<PrismaRatePlan>
      update: (args: unknown) => Promise<PrismaRatePlan>
    }
  }

  async findById(id: string): Promise<RatePlan | null> {
    try {
      const raw = await this.delegate.findUnique({ where: { id } })
      return raw ? toDomain(raw) : null
    } catch (err) {
      const m = fromPrismaError(err)
      if (m) throw m
      throw err
    }
  }

  async findByCode(hotelId: string, code: string): Promise<RatePlan | null> {
    try {
      const raw = await this.delegate.findFirst({ where: { hotelId, code, deletedAt: null } })
      return raw ? toDomain(raw) : null
    } catch (err) {
      const m = fromPrismaError(err)
      if (m) throw m
      throw err
    }
  }

  async create(data: CreateRatePlanData): Promise<RatePlan> {
    try {
      const raw = await this.delegate.create({ data: { ...data } })
      return toDomain(raw)
    } catch (err) {
      const m = fromPrismaError(err)
      if (m) throw m
      throw err
    }
  }

  async update(id: string, data: UpdateRatePlanData): Promise<RatePlan> {
    try {
      const raw = await this.delegate.update({ where: { id }, data })
      return toDomain(raw)
    } catch (err) {
      const m = fromPrismaError(err)
      if (m) throw m
      throw err
    }
  }

  async softDelete(id: string): Promise<void> {
    try {
      await this.delegate.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      })
    } catch (err) {
      const m = fromPrismaError(err)
      if (m) throw m
      throw err
    }
  }

  async findMany(
    organizationId: string,
    filter: RatePlanFilter,
  ): Promise<PaginatedResult<RatePlan>> {
    const where: Record<string, unknown> = { organizationId, deletedAt: null }
    if (filter.hotelId) where['hotelId'] = filter.hotelId
    if (filter.roomTypeId) where['roomTypeId'] = filter.roomTypeId
    if (filter.isActive !== undefined) where['isActive'] = filter.isActive
    if (filter.search) where['name'] = { contains: filter.search, mode: 'insensitive' }

    const [rows, total] = await Promise.all([
      this.delegate.findMany({
        where,
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.delegate.count({ where }),
    ])
    return { data: rows.map(toDomain), meta: buildPaginationMeta(total, filter.page, filter.limit) }
  }
}
