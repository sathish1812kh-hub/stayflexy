import { getPrismaClient, Prisma } from '@stayflexi/shared-database'
import { buildPaginationMeta } from '@stayflexi/shared-types'
import { fromPrismaError } from '@stayflexi/shared-errors'
import type { PrismaClient } from '@prisma/client'
import { FeeConfig } from '../../domain/entities/FeeConfig'
import type {
  IFeeConfigRepository,
  CreateFeeConfigData,
  UpdateFeeConfigData,
  FeeConfigListParams,
} from '../../domain/repositories/IFeeConfigRepository'
import type { PaginatedResult } from '@stayflexi/shared-types'

type PrismaFeeConfig = Prisma.FeeConfigGetPayload<Record<string, never>>

function mapToFeeConfig(raw: PrismaFeeConfig): FeeConfig {
  return FeeConfig.fromPrisma({
    id: raw.id,
    organizationId: raw.organizationId,
    hotelId: raw.hotelId,
    name: raw.name,
    description: raw.description,
    type: raw.type as FeeConfig['type'],
    rate: raw.rate,
    appliesTo: raw.appliesTo,
    isActive: raw.isActive,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    deletedAt: raw.deletedAt,
  })
}

export class PrismaFeeConfigRepository implements IFeeConfigRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async create(data: CreateFeeConfigData): Promise<FeeConfig> {
    try {
      const raw = await this.db.feeConfig.create({
        data: {
          organizationId: data.organizationId,
          hotelId: data.hotelId ?? null,
          name: data.name,
          description: data.description ?? null,
          type: data.type as PrismaFeeConfig['type'],
          rate: new Prisma.Decimal(data.rate),
          appliesTo: data.appliesTo ?? ['ROOM'],
          isActive: data.isActive ?? true,
        },
      })
      return mapToFeeConfig(raw)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async findById(id: string, organizationId?: string): Promise<FeeConfig | null> {
    const raw = await this.db.feeConfig.findFirst({
      where: {
        id,
        ...(organizationId ? { organizationId } : {}),
        deletedAt: null,
      },
    })
    return raw ? mapToFeeConfig(raw) : null
  }

  async list(params: FeeConfigListParams): Promise<PaginatedResult<FeeConfig>> {
    const skip = (params.page - 1) * params.limit
    const where: Prisma.FeeConfigWhereInput = {
      organizationId: params.organizationId,
      deletedAt: null,
    }
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
      this.db.feeConfig.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: params.limit,
      }),
      this.db.feeConfig.count({ where }),
    ])

    return {
      data: records.map(mapToFeeConfig),
      meta: buildPaginationMeta(total, params.page, params.limit),
    }
  }

  async update(id: string, data: UpdateFeeConfigData, organizationId?: string): Promise<FeeConfig> {
    const existing = await this.db.feeConfig.findFirst({
      where: { id, ...(organizationId ? { organizationId } : {}), deletedAt: null },
    })
    if (!existing) throw new Error('NOT_FOUND: Fee config not found')

    try {
      const raw = await this.db.feeConfig.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.type !== undefined && { type: data.type as PrismaFeeConfig['type'] }),
          ...(data.rate !== undefined && { rate: new Prisma.Decimal(data.rate) }),
          ...(data.appliesTo !== undefined && { appliesTo: data.appliesTo }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      })
      return mapToFeeConfig(raw)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async delete(id: string, organizationId?: string): Promise<void> {
    const existing = await this.db.feeConfig.findFirst({
      where: { id, ...(organizationId ? { organizationId } : {}), deletedAt: null },
    })
    if (!existing) throw new Error('NOT_FOUND: Fee config not found')

    await this.db.feeConfig.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async findActive(organizationId: string, hotelId?: string | null): Promise<FeeConfig[]> {
    const where: Prisma.FeeConfigWhereInput = {
      organizationId,
      isActive: true,
      deletedAt: null,
    }
    if (hotelId) {
      where['OR'] = [{ hotelId: null }, { hotelId }]
    } else if (hotelId === null) {
      where['hotelId'] = null
    }

    const records = await this.db.feeConfig.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    })
    return records.map(mapToFeeConfig)
  }
}
