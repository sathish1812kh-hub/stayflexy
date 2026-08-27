import type { PrismaClient, Prisma } from '@prisma/client'
import { getPrismaClient } from '@stayflexi/shared-database'
import { fromPrismaError } from '@stayflexi/shared-errors'
import { buildPaginationMeta } from '@stayflexi/shared-types'
import { CancellationPolicyEntity } from '../../domain/entities/CancellationPolicy'
import type { ICancellationPolicyRepository } from '../../domain/repositories/ICancellationPolicyRepository'
import type { PaginatedResult } from '@stayflexi/shared-types'
import type { RefundMethod } from '@prisma/client'

type PrismaCancellationPolicy = Prisma.CancellationPolicyGetPayload<Record<string, never>>

function mapToPolicy(raw: PrismaCancellationPolicy): CancellationPolicyEntity {
  return CancellationPolicyEntity.fromPrisma({
    id: raw.id,
    organizationId: raw.organizationId,
    hotelId: raw.hotelId,
    name: raw.name,
    description: raw.description,
    noticeHours: raw.noticeHours,
    penaltyPercent: raw.penaltyPercent,
    refundMethod: raw.refundMethod,
    nonRefundableAfter: raw.nonRefundableAfter,
    isDefault: raw.isDefault,
    appliesToSources: raw.appliesToSources,
    appliesToRatePlans: raw.appliesToRatePlans,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    deletedAt: raw.deletedAt,
  })
}

export class PrismaCancellationPolicyRepository implements ICancellationPolicyRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async create(data: {
    organizationId: string
    hotelId?: string | null
    name: string
    description?: string | null
    noticeHours?: number
    penaltyPercent?: number
    refundMethod?: RefundMethod
    nonRefundableAfter?: Date | null
    isDefault?: boolean
    appliesToSources?: string[]
    appliesToRatePlans?: string[]
  }): Promise<CancellationPolicyEntity> {
    // If this is set as default, unset other defaults in same scope
    if (data.isDefault) {
      await this.db.cancellationPolicy.updateMany({
        where: {
          organizationId: data.organizationId,
          hotelId: data.hotelId ?? null,
          isDefault: true,
        },
        data: { isDefault: false },
      })
    }

    try {
      const raw = await this.db.cancellationPolicy.create({
        data: {
          organizationId: data.organizationId,
          hotelId: data.hotelId ?? null,
          name: data.name,
          description: data.description ?? null,
          noticeHours: data.noticeHours ?? 24,
          penaltyPercent: data.penaltyPercent ?? 0,
          refundMethod: data.refundMethod ?? 'ORIGINAL_PAYMENT',
          nonRefundableAfter: data.nonRefundableAfter ?? null,
          isDefault: data.isDefault ?? false,
          appliesToSources: data.appliesToSources ?? ['DIRECT'],
          appliesToRatePlans: data.appliesToRatePlans ?? [],
        },
      })
      return mapToPolicy(raw)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async findById(
    id: string,
    organizationId?: string | null,
  ): Promise<CancellationPolicyEntity | null> {
    const raw = await this.db.cancellationPolicy.findFirst({
      where: {
        id,
        ...(organizationId ? { organizationId } : {}),
        deletedAt: null,
      },
    })
    return raw ? mapToPolicy(raw) : null
  }

  async findDefault(
    organizationId: string,
    hotelId?: string | null,
  ): Promise<CancellationPolicyEntity | null> {
    const raw = await this.db.cancellationPolicy.findFirst({
      where: {
        organizationId,
        hotelId: hotelId ?? null,
        isDefault: true,
        deletedAt: null,
      },
    })
    return raw ? mapToPolicy(raw) : null
  }

  async list(
    organizationId: string,
    options?: {
      hotelId?: string | null
      search?: string
      page?: number
      limit?: number
    },
  ): Promise<PaginatedResult<CancellationPolicyEntity>> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 20
    const skip = (page - 1) * limit

    const where: Prisma.CancellationPolicyWhereInput = {
      organizationId,
      deletedAt: null,
    }
    if (options?.hotelId) where.hotelId = options.hotelId
    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ]
    }

    const [records, total] = await Promise.all([
      this.db.cancellationPolicy.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.db.cancellationPolicy.count({ where }),
    ])

    return {
      data: records.map(mapToPolicy),
      meta: buildPaginationMeta(total, page, limit),
    }
  }

  async update(
    id: string,
    data: Partial<{
      name: string
      description: string | null
      noticeHours: number
      penaltyPercent: number
      refundMethod: RefundMethod
      nonRefundableAfter: Date | null
      isDefault: boolean
      appliesToSources: string[]
      appliesToRatePlans: string[]
    }>,
    organizationId?: string | null,
  ): Promise<CancellationPolicyEntity> {
    const existing = await this.db.cancellationPolicy.findFirst({
      where: { id, ...(organizationId ? { organizationId } : {}), deletedAt: null },
    })
    if (!existing) throw new Error('NOT_FOUND: Cancellation policy not found')

    // If setting as default, unset other defaults in same scope
    if (data.isDefault) {
      await this.db.cancellationPolicy.updateMany({
        where: {
          organizationId: existing.organizationId,
          hotelId: existing.hotelId,
          isDefault: true,
          NOT: { id },
        },
        data: { isDefault: false },
      })
    }

    try {
      const raw = await this.db.cancellationPolicy.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.noticeHours !== undefined && { noticeHours: data.noticeHours }),
          ...(data.penaltyPercent !== undefined && { penaltyPercent: data.penaltyPercent }),
          ...(data.refundMethod !== undefined && { refundMethod: data.refundMethod }),
          ...(data.nonRefundableAfter !== undefined && {
            nonRefundableAfter: data.nonRefundableAfter,
          }),
          ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
          ...(data.appliesToSources !== undefined && { appliesToSources: data.appliesToSources }),
          ...(data.appliesToRatePlans !== undefined && {
            appliesToRatePlans: data.appliesToRatePlans,
          }),
        },
      })
      return mapToPolicy(raw)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async delete(id: string, organizationId?: string | null): Promise<void> {
    const existing = await this.db.cancellationPolicy.findFirst({
      where: { id, ...(organizationId ? { organizationId } : {}), deletedAt: null },
    })
    if (!existing) throw new Error('NOT_FOUND: Cancellation policy not found')

    await this.db.cancellationPolicy.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async findApplicable(
    organizationId: string,
    hotelId: string,
    source: string,
    ratePlanId?: string,
  ): Promise<CancellationPolicyEntity | null> {
    // Priority: hotel-specific default > org-wide default > any matching policy
    const hotelDefault = await this.findDefault(organizationId, hotelId)
    if (hotelDefault && hotelDefault.isApplicableToSource(source)) {
      if (!ratePlanId || hotelDefault.isApplicableToRatePlan(ratePlanId)) {
        return hotelDefault
      }
    }

    const orgDefault = await this.findDefault(organizationId, null)
    if (orgDefault && orgDefault.isApplicableToSource(source)) {
      if (!ratePlanId || orgDefault.isApplicableToRatePlan(ratePlanId)) {
        return orgDefault
      }
    }

    // Fallback: find any matching policy for the hotel/org
    const policies = await this.db.cancellationPolicy.findMany({
      where: {
        organizationId,
        OR: [{ hotelId: null }, { hotelId }],
        deletedAt: null,
      },
      orderBy: { isDefault: 'desc' }, // defaults first
    })

    for (const policy of policies.map(mapToPolicy)) {
      if (
        policy.isApplicableToSource(source) &&
        (!ratePlanId || policy.isApplicableToRatePlan(ratePlanId || ''))
      ) {
        return policy
      }
    }

    return null
  }
}
