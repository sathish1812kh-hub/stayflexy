import type { Guest } from '../entities/Guest'
import type { GovIdType } from '@prisma/client'

export interface IGuestRepository {
  create(data: {
    organizationId: string
    hotelId?: string | null
    firstName: string
    lastName: string
    email?: string | null
    phone?: string | null
    nationality?: string | null
    dateOfBirth?: Date | null
    governmentIdType?: Guest['governmentIdType']
    governmentIdNumber?: string | null
    preferences?: Record<string, unknown> | null
    loyaltyTier?: string | null
    loyaltyPoints?: number
    metadata?: Record<string, unknown> | null
  }): Promise<Guest>

  findById(id: string, organizationId?: string | null): Promise<Guest | null>

  findByEmail(email: string, organizationId: string): Promise<Guest | null>

  update(
    id: string,
    data: Partial<{
      hotelId: string | null
      firstName: string
      lastName: string
      email: string | null
      phone: string | null
      nationality: string | null
      dateOfBirth: Date | null
      governmentIdType: Guest['governmentIdType']
      governmentIdNumber: string | null
      preferences: Record<string, unknown> | null
      loyaltyTier: string | null
      loyaltyPoints: number
      metadata: Record<string, unknown> | null
    }>,
    organizationId?: string | null,
  ): Promise<Guest>

  delete(id: string, organizationId?: string | null): Promise<void>

  list(
    organizationId: string,
    options?: {
      hotelId?: string | null
      search?: string
      loyaltyTier?: string
      page?: number
      limit?: number
    },
  ): Promise<{ data: Guest[]; meta: { total: number; page: number; limit: number } }>

  findOrCreateByEmail(data: {
    organizationId: string
    hotelId?: string | null
    email: string
    firstName: string
    lastName: string
    phone?: string | null
    nationality?: string | null
    dateOfBirth?: Date | null
    governmentIdType?: Guest['governmentIdType']
    governmentIdNumber?: string | null
  }): Promise<Guest>
}
