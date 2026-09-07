export type DiscountType = 'PERCENTAGE' | 'FIXED'

export interface PromotionProps {
  id: string
  organizationId: string
  hotelId: string | null
  code: string
  name: string
  description: string | null
  discountType: DiscountType
  discountValue: number
  minNights: number
  validFrom: Date
  validTo: Date
  maxUses: number | null
  usedCount: number
  isActive: boolean
  createdById: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export class Promotion {
  constructor(private readonly props: PromotionProps) {}

  get id(): string {
    return this.props.id
  }
  get organizationId(): string {
    return this.props.organizationId
  }
  get hotelId(): string | null {
    return this.props.hotelId
  }
  get code(): string {
    return this.props.code
  }
  get name(): string {
    return this.props.name
  }
  get discountType(): DiscountType {
    return this.props.discountType
  }
  get discountValue(): number {
    return this.props.discountValue
  }
  get minNights(): number {
    return this.props.minNights
  }
  get validFrom(): Date {
    return this.props.validFrom
  }
  get validTo(): Date {
    return this.props.validTo
  }
  get maxUses(): number | null {
    return this.props.maxUses
  }
  get usedCount(): number {
    return this.props.usedCount
  }
  get isActive(): boolean {
    return this.props.isActive
  }
  get deletedAt(): Date | null {
    return this.props.deletedAt
  }

  isValidForDate(date: Date): boolean {
    return (
      this.props.isActive &&
      !this.props.deletedAt &&
      date >= this.props.validFrom &&
      date <= this.props.validTo
    )
  }

  canRedeem(): boolean {
    if (!this.props.isActive || this.props.deletedAt) return false
    const now = new Date()
    if (now < this.props.validFrom || now > this.props.validTo) return false
    if (this.props.maxUses !== null && this.props.usedCount >= this.props.maxUses) return false
    return true
  }

  calculateDiscount(baseAmount: number): number {
    if (this.props.discountType === 'PERCENTAGE')
      return (baseAmount * this.props.discountValue) / 100
    return Math.min(this.props.discountValue, baseAmount)
  }

  belongsToOrganization(orgId: string): boolean {
    return this.props.organizationId === orgId
  }

  toJSON(): PromotionProps {
    return { ...this.props }
  }
}

export interface CouponRedemptionProps {
  id: string
  promotionId: string
  bookingId: string | null
  organizationId: string
  hotelId: string | null
  guestId: string | null
  discountApplied: number
  redeemedAt: Date
  redeemedById: string | null
}

export class CouponRedemption {
  constructor(private readonly props: CouponRedemptionProps) {}
  get id(): string {
    return this.props.id
  }
  get promotionId(): string {
    return this.props.promotionId
  }
  get organizationId(): string {
    return this.props.organizationId
  }
  get discountApplied(): number {
    return this.props.discountApplied
  }
  get redeemedAt(): Date {
    return this.props.redeemedAt
  }
  toJSON(): CouponRedemptionProps {
    return { ...this.props }
  }
}
