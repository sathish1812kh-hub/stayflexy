import type { RefundMethod } from '@prisma/client'
import { Prisma } from '@prisma/client'

export interface CancellationPolicy {
  id: string
  organizationId: string
  hotelId: string | null
  name: string
  description: string | null
  noticeHours: number
  penaltyPercent: number
  refundMethod: RefundMethod
  nonRefundableAfter: Date | null
  isDefault: boolean
  appliesToSources: string[]
  appliesToRatePlans: string[]
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null

  // Business logic helpers
  isApplicableToSource(source: string): boolean
  isApplicableToRatePlan(ratePlanId: string): boolean
  calculateRefund(
    amount: number,
    checkInDate: Date,
  ): { refundAmount: number; penaltyAmount: number }
  canCancel(checkInDate: Date): { allowed: boolean; reason?: string }
}

export class CancellationPolicyEntity implements CancellationPolicy {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly hotelId: string | null,
    public readonly name: string,
    public readonly description: string | null,
    public readonly noticeHours: number,
    public readonly penaltyPercent: number,
    public readonly refundMethod: RefundMethod,
    public readonly nonRefundableAfter: Date | null,
    public readonly isDefault: boolean,
    public readonly appliesToSources: string[],
    public readonly appliesToRatePlans: string[],
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly deletedAt: Date | null,
  ) {}

  isApplicableToSource(source: string): boolean {
    return this.appliesToSources.length === 0 || this.appliesToSources.includes(source)
  }

  isApplicableToRatePlan(ratePlanId: string): boolean {
    return this.appliesToRatePlans.length === 0 || this.appliesToRatePlans.includes(ratePlanId)
  }

  calculateRefund(
    amount: number,
    checkInDate: Date,
  ): { refundAmount: number; penaltyAmount: number } {
    if (this.nonRefundableAfter && new Date() > this.nonRefundableAfter) {
      return { refundAmount: 0, penaltyAmount: amount }
    }
    const penalty = (amount * this.penaltyPercent) / 100
    return { refundAmount: amount - penalty, penaltyAmount: penalty }
  }

  canCancel(checkInDate: Date): { allowed: boolean; reason?: string } {
    if (this.nonRefundableAfter && new Date() > this.nonRefundableAfter) {
      return { allowed: false, reason: 'Past non-refundable cutoff date' }
    }
    const noticeMs = this.noticeHours * 60 * 60 * 1000
    if (new Date(checkInDate.getTime() - noticeMs) < new Date()) {
      return {
        allowed: false,
        reason: `Less than ${this.noticeHours} hours notice before check-in`,
      }
    }
    return { allowed: true }
  }

  static fromPrisma(row: {
    id: string
    organizationId: string
    hotelId: string | null
    name: string
    description: string | null
    noticeHours: number
    penaltyPercent: Prisma.Decimal
    refundMethod: RefundMethod
    nonRefundableAfter: Date | null
    isDefault: boolean
    appliesToSources: string[]
    appliesToRatePlans: string[]
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
  }): CancellationPolicyEntity {
    return new CancellationPolicyEntity(
      row.id,
      row.organizationId,
      row.hotelId,
      row.name,
      row.description,
      row.noticeHours,
      Number(row.penaltyPercent),
      row.refundMethod,
      row.nonRefundableAfter,
      row.isDefault,
      row.appliesToSources,
      row.appliesToRatePlans,
      row.createdAt,
      row.updatedAt,
      row.deletedAt,
    )
  }
}
