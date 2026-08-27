import type { GovIdType } from '@prisma/client'

export interface Guest {
  id: string
  organizationId: string
  hotelId: string | null
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  nationality: string | null
  dateOfBirth: Date | null
  governmentIdType: GovIdType | null
  governmentIdNumber: string | null
  preferences: Record<string, unknown> | null
  loyaltyTier: string | null
  loyaltyPoints: number
  metadata: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null

  getFullName(): string
}

export class GuestEntity implements Guest {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly hotelId: string | null,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly email: string | null,
    public readonly phone: string | null,
    public readonly nationality: string | null,
    public readonly dateOfBirth: Date | null,
    public readonly governmentIdType: GovIdType | null,
    public readonly governmentIdNumber: string | null,
    public readonly preferences: Record<string, unknown> | null,
    public readonly loyaltyTier: string | null,
    public readonly loyaltyPoints: number,
    public readonly metadata: Record<string, unknown> | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly deletedAt: Date | null,
  ) {}

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`.trim()
  }

  static fromPrisma(row: {
    id: string
    organizationId: string
    hotelId: string | null
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    nationality: string | null
    dateOfBirth: Date | null
    governmentIdType: GovIdType | null
    governmentIdNumber: string | null
    preferences: Record<string, unknown> | null
    loyaltyTier: string | null
    loyaltyPoints: number
    metadata: Record<string, unknown> | null
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
  }): GuestEntity {
    return new GuestEntity(
      row.id,
      row.organizationId,
      row.hotelId,
      row.firstName,
      row.lastName,
      row.email,
      row.phone,
      row.nationality,
      row.dateOfBirth,
      row.governmentIdType,
      row.governmentIdNumber,
      row.preferences,
      row.loyaltyTier,
      row.loyaltyPoints,
      row.metadata,
      row.createdAt,
      row.updatedAt,
      row.deletedAt,
    )
  }
}
