import type { PrismaClient, Prisma } from '@prisma/client'
import { buildPaginationMeta } from '@stayflexi/shared-types'
import type { PaginatedResult } from '@stayflexi/shared-types'
import { fromPrismaError } from '@stayflexi/shared-errors'
import { Promotion, CouponRedemption } from '../../domain/entities/Promotion'
import type { PromotionProps, CouponRedemptionProps } from '../../domain/entities/Promotion'
import type {
  IPromotionRepository,
  CreatePromotionData,
  UpdatePromotionData,
  PromotionFilter,
  RedeemData,
} from '../../domain/repositories/IPromotionRepository'

type PrismaPromotion = Prisma.PromotionGetPayload<Record<string, never>>
type PrismaRedemption = Prisma.CouponRedemptionGetPayload<Record<string, never>>

function toDomain(raw: PrismaPromotion): Promotion {
  return new Promotion({
    id: (raw as unknown as PromotionProps).id,
    organizationId: (raw as unknown as PromotionProps).organizationId,
    hotelId: (raw as unknown as PromotionProps).hotelId ?? null,
    code: (raw as unknown as PromotionProps).code,
    name: (raw as unknown as PromotionProps).name,
    description: (raw as unknown as PromotionProps).description ?? null,
    discountType: (raw as unknown as PromotionProps).discountType,
    discountValue: Number((raw as unknown as { discountValue: unknown }).discountValue),
    minNights: (raw as unknown as PromotionProps).minNights,
    validFrom: (raw as unknown as PromotionProps).validFrom,
    validTo: (raw as unknown as PromotionProps).validTo,
    maxUses: (raw as unknown as PromotionProps).maxUses ?? null,
    usedCount: (raw as unknown as PromotionProps).usedCount,
    isActive: (raw as unknown as PromotionProps).isActive,
    createdById: (raw as unknown as PromotionProps).createdById ?? null,
    createdAt: (raw as unknown as PromotionProps).createdAt,
    updatedAt: (raw as unknown as PromotionProps).updatedAt,
    deletedAt: (raw as unknown as PromotionProps).deletedAt ?? null,
  })
}

function toRedemption(raw: PrismaRedemption): CouponRedemption {
  return new CouponRedemption({
    id: (raw as unknown as CouponRedemptionProps).id,
    promotionId: (raw as unknown as CouponRedemptionProps).promotionId,
    bookingId: (raw as unknown as CouponRedemptionProps).bookingId ?? null,
    organizationId: (raw as unknown as CouponRedemptionProps).organizationId,
    hotelId: (raw as unknown as CouponRedemptionProps).hotelId ?? null,
    guestId: (raw as unknown as CouponRedemptionProps).guestId ?? null,
    discountApplied: Number((raw as unknown as { discountApplied: unknown }).discountApplied),
    redeemedAt: (raw as unknown as CouponRedemptionProps).redeemedAt,
    redeemedById: (raw as unknown as CouponRedemptionProps).redeemedById ?? null,
  })
}

export class PrismaPromotionRepository implements IPromotionRepository {
  constructor(private readonly db: PrismaClient) {}

  private get promoDelegate(): {
    findUnique: (a: unknown) => Promise<PrismaPromotion | null>
    findFirst: (a: unknown) => Promise<PrismaPromotion | null>
    findMany: (a: unknown) => Promise<PrismaPromotion[]>
    count: (a: unknown) => Promise<number>
    create: (a: unknown) => Promise<PrismaPromotion>
    update: (a: unknown) => Promise<PrismaPromotion>
  } {
    return (this.db as unknown as Record<string, unknown>)['promotion'] as unknown as {
      findUnique: (a: unknown) => Promise<PrismaPromotion | null>
      findFirst: (a: unknown) => Promise<PrismaPromotion | null>
      findMany: (a: unknown) => Promise<PrismaPromotion[]>
      count: (a: unknown) => Promise<number>
      create: (a: unknown) => Promise<PrismaPromotion>
      update: (a: unknown) => Promise<PrismaPromotion>
    }
  }

  private get redemptionDelegate(): {
    findMany: (a: unknown) => Promise<PrismaRedemption[]>
    create: (a: unknown) => Promise<PrismaRedemption>
  } {
    return (this.db as unknown as Record<string, unknown>)['couponRedemption'] as unknown as {
      findMany: (a: unknown) => Promise<PrismaRedemption[]>
      create: (a: unknown) => Promise<PrismaRedemption>
    }
  }

  async findById(id: string): Promise<Promotion | null> {
    try {
      const r = await this.promoDelegate.findUnique({ where: { id } })
      return r ? toDomain(r) : null
    } catch (e) {
      const m = fromPrismaError(e)
      if (m) throw m
      throw e
    }
  }

  async findByCode(code: string): Promise<Promotion | null> {
    try {
      const r = await this.promoDelegate.findFirst({
        where: { code: code.toUpperCase(), deletedAt: null },
      })
      return r ? toDomain(r) : null
    } catch (e) {
      const m = fromPrismaError(e)
      if (m) throw m
      throw e
    }
  }

  async create(data: CreatePromotionData): Promise<Promotion> {
    try {
      const r = await this.promoDelegate.create({ data })
      return toDomain(r)
    } catch (e) {
      const m = fromPrismaError(e)
      if (m) throw m
      throw e
    }
  }

  async update(id: string, data: UpdatePromotionData): Promise<Promotion> {
    try {
      const r = await this.promoDelegate.update({ where: { id }, data })
      return toDomain(r)
    } catch (e) {
      const m = fromPrismaError(e)
      if (m) throw m
      throw e
    }
  }

  async softDelete(id: string): Promise<void> {
    try {
      await this.promoDelegate.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      })
    } catch (e) {
      const m = fromPrismaError(e)
      if (m) throw m
      throw e
    }
  }

  async findMany(
    organizationId: string,
    filter: PromotionFilter,
  ): Promise<PaginatedResult<Promotion>> {
    const where: Record<string, unknown> = { organizationId, deletedAt: null }
    if (filter.hotelId) where['hotelId'] = filter.hotelId
    if (filter.isActive !== undefined) where['isActive'] = filter.isActive
    if (filter.discountType) where['discountType'] = filter.discountType
    if (filter.search) where['name'] = { contains: filter.search, mode: 'insensitive' }
    const [rows, total] = await Promise.all([
      this.promoDelegate.findMany({
        where,
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.promoDelegate.count({ where }),
    ])
    return { data: rows.map(toDomain), meta: buildPaginationMeta(total, filter.page, filter.limit) }
  }

  async redeem(data: RedeemData): Promise<CouponRedemption> {
    try {
      const r = await this.redemptionDelegate.create({ data: { ...data } })
      return toRedemption(r)
    } catch (e) {
      const m = fromPrismaError(e)
      if (m) throw m
      throw e
    }
  }

  async listRedemptions(promotionId: string): Promise<CouponRedemption[]> {
    const rows = await this.redemptionDelegate.findMany({
      where: { promotionId },
      orderBy: { redeemedAt: 'desc' },
    })
    return rows.map(toRedemption)
  }

  async incrementUsedCount(id: string): Promise<Promotion> {
    const r = await this.promoDelegate.update({
      where: { id },
      data: { usedCount: { increment: 1 } },
    })
    return toDomain(r)
  }
}
