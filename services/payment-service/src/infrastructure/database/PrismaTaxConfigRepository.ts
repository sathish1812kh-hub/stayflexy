import { getPrismaClient, Prisma } from '@stayflexi/shared-database'
import { buildPaginationMeta } from '@stayflexi/shared-types'
import { fromPrismaError } from '@stayflexi/shared-errors'
import type { PrismaClient } from '@prisma/client'
import { TaxConfig } from '../../domain/entities/TaxConfig'
import type {
  ITaxConfigRepository,
  CreateTaxConfigData,
  UpdateTaxConfigData,
  TaxConfigListParams,
} from '../../domain/repositories/ITaxConfigRepository'
import type { PaginatedResult } from '@stayflexi/shared-types'

type PrismaTaxConfig = Prisma.TaxConfigGetPayload<Record<string, never>>

function mapToTaxConfig(raw: PrismaTaxConfig): TaxConfig {
  return TaxConfig.fromPrisma({
    id: raw.id,
    organizationId: raw.organizationId,
    hotelId: raw.hotelId,
    name: raw.name,
    description: raw.description,
    type: raw.type as TaxConfig['type'],
    rate: raw.rate,
    appliesTo: raw.appliesTo,
    isActive: raw.isActive,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    deletedAt: raw.deletedAt,
  })
}

export class PrismaTaxConfigRepository implements ITaxConfigRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async create(data: CreateTaxConfigData): Promise<TaxConfig> {
    try {
      const raw = await this.db.taxConfig.create({
        data: {
          organizationId: data.organizationId,
          hotelId: data.hotelId ?? null,
          name: data.name,
          description: data.description ?? null,
          type: data.type as PrismaTaxConfig['type'],
          rate: new Prisma.Decimal(data.rate),
          appliesTo: data.appliesTo ?? ['ROOM'],
          isActive: data.isActive ?? true,
        },
      })
      return mapToTaxConfig(raw)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async findById(id: string, organizationId?: string): Promise<TaxConfig | null> {
    const raw = await this.db.taxConfig.findFirst({
      where: {
        id,
        ...(organizationId ? { organizationId } : {}),
        deletedAt: null,
      },
    })
    return raw ? mapToTaxConfig(raw) : null
  }

  async list(params: TaxConfigListParams): Promise<PaginatedResult<TaxConfig>> {
    const skip = (params.page - 1) * params.limit
    const where: Prisma.TaxConfigWhereInput = {
      organizationId: params.organizationId,
      deletedAt: null,
    }
    // hotelId filter: if explicitly provided, scope to that hotel OR org-wide (null) ? spec says nullable org-wide default
    // For list we filter strictly if hotelId provided
    if (params.hotelId !== undefined) {
      where['hotelId'] = params.hotelId
    }
    if (params.isActive !== undefined) {
      where['isActive'] = params.isActive
    }
    if (params.search) {
      where['OR'] = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ]
    }

    const [records, total] = await Promise.all([
      this.db.taxConfig.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: params.limit,
      }),
      this.db.taxConfig.count({ where }),
    ])

    return {
      data: records.map(mapToTaxConfig),
      meta: buildPaginationMeta(total, params.page, params.limit),
    }
  }

  async update(id: string, data: UpdateTaxConfigData, organizationId?: string): Promise<TaxConfig> {
    const existing = await this.db.taxConfig.findFirst({
      where: { id, ...(organizationId ? { organizationId } : {}), deletedAt: null },
    })
    if (!existing) throw new Error('NOT_FOUND: Tax config not found')

    try {
      const raw = await this.db.taxConfig.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.type !== undefined && { type: data.type as PrismaTaxConfig['type'] }),
          ...(data.rate !== undefined && { rate: new Prisma.Decimal(data.rate) }),
          ...(data.appliesTo !== undefined && { appliesTo: data.appliesTo }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      })
      return mapToTaxConfig(raw)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async delete(id: string, organizationId?: string): Promise<void> {
    const existing = await this.db.taxConfig.findFirst({
      where: { id, ...(organizationId ? { organizationId } : {}), deletedAt: null },
    })
    if (!existing) throw new Error('NOT_FOUND: Tax config not found')

    await this.db.taxConfig.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async findActive(organizationId: string, hotelId?: string | null): Promise<TaxConfig[]> {
    const where: Prisma.TaxConfigWhereInput = {
      organizationId,
      isActive: true,
      deletedAt: null,
    }
    if (hotelId) {
      where['OR'] = [{ hotelId: null }, { hotelId }]
    } else if (hotelId === null) {
      where['hotelId'] = null
    }
    // If hotelId undefined, return all active for org (both hotel-specific and org-wide)

    const records = await this.db.taxConfig.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    })
    return records.map(mapToTaxConfig)
  }
}
