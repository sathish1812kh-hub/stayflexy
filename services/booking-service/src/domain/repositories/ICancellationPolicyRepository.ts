import type { CancellationPolicy } from '../entities/CancellationPolicy'
import type { RefundMethod } from '@prisma/client'

export interface ICancellationPolicyRepository {
  create(data: {
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
  }): Promise<CancellationPolicy>

  findById(id: string, organizationId?: string | null): Promise<CancellationPolicy | null>

  findDefault(organizationId: string, hotelId?: string | null): Promise<CancellationPolicy | null>

  list(
    organizationId: string,
    options?: {
      hotelId?: string | null
      search?: string
      page?: number
      limit?: number
    },
  ): Promise<{ data: CancellationPolicy[]; meta: { total: number; page: number; limit: number } }>

  update(
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
  ): Promise<CancellationPolicy>

  delete(id: string, organizationId?: string | null): Promise<void>

  // Find policy applicable to a booking
  findApplicable(
    organizationId: string,
    hotelId: string,
    source: string,
    ratePlanId?: string,
  ): Promise<CancellationPolicy | null>
}
