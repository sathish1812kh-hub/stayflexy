import type { Promotion, CouponRedemption } from '../entities/Promotion'
import type { PaginatedResult } from '@stayflexi/shared-types'

export interface CreatePromotionData {
  organizationId: string
  hotelId?: string | null
  code: string
  name: string
  description?: string | null
  discountType: 'PERCENTAGE' | 'FIXED'
  discountValue: number
  minNights?: number
  validFrom: Date
  validTo: Date
  maxUses?: number | null
  isActive?: boolean
  createdById?: string | null
}

export interface UpdatePromotionData {
  name?: string
  description?: string | null
  discountType?: 'PERCENTAGE' | 'FIXED'
  discountValue?: number
  minNights?: number
  validFrom?: Date
  validTo?: Date
  maxUses?: number | null
  isActive?: boolean
}

export interface PromotionFilter {
  hotelId?: string
  isActive?: boolean
  discountType?: string
  search?: string
  page: number
  limit: number
}

export interface RedeemData {
  promotionId: string
  organizationId: string
  hotelId?: string | null
  bookingId?: string | null
  guestId?: string | null
  discountApplied: number
  redeemedById?: string | null
}

export interface IPromotionRepository {
  findById(id: string): Promise<Promotion | null>
  findByCode(code: string): Promise<Promotion | null>
  create(data: CreatePromotionData): Promise<Promotion>
  update(id: string, data: UpdatePromotionData): Promise<Promotion>
  softDelete(id: string): Promise<void>
  findMany(organizationId: string, filter: PromotionFilter): Promise<PaginatedResult<Promotion>>
  redeem(data: RedeemData): Promise<CouponRedemption>
  listRedemptions(promotionId: string): Promise<CouponRedemption[]>
  incrementUsedCount(id: string): Promise<Promotion>
}
