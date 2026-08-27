import { Prisma } from '@prisma/client'

export type FeeType = 'PERCENTAGE' | 'FIXED' | 'PER_NIGHT' | 'PER_PERSON'

export interface FeeConfigProps {
  id: string
  organizationId: string
  hotelId: string | null
  name: string
  description: string | null
  type: FeeType
  rate: number
  appliesTo: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export class FeeConfig {
  constructor(private readonly props: FeeConfigProps) {}

  get id() {
    return this.props.id
  }
  get organizationId() {
    return this.props.organizationId
  }
  get hotelId() {
    return this.props.hotelId
  }
  get name() {
    return this.props.name
  }
  get description() {
    return this.props.description
  }
  get type() {
    return this.props.type
  }
  get rate() {
    return this.props.rate
  }
  get appliesTo() {
    return this.props.appliesTo
  }
  get isActive() {
    return this.props.isActive
  }
  get createdAt() {
    return this.props.createdAt
  }
  get updatedAt() {
    return this.props.updatedAt
  }
  get deletedAt() {
    return this.props.deletedAt
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== null
  }
  get isOrgWide(): boolean {
    return this.props.hotelId === null
  }

  belongsToOrganization(orgId: string): boolean {
    return this.props.organizationId === orgId
  }

  calculate(baseAmount: number, opts?: { nights?: number; persons?: number }): number {
    const rate = this.props.rate
    switch (this.props.type) {
      case 'PERCENTAGE':
        return Math.round(((baseAmount * rate) / 100) * 100) / 100
      case 'FIXED':
        return rate
      case 'PER_NIGHT':
        return rate * (opts?.nights ?? 1)
      case 'PER_PERSON':
        return rate * (opts?.persons ?? 1)
      default:
        return 0
    }
  }

  toJSON(): FeeConfigProps {
    return { ...this.props }
  }

  static fromPrisma(row: {
    id: string
    organizationId: string
    hotelId: string | null
    name: string
    description: string | null
    type: FeeType
    rate: Prisma.Decimal
    appliesTo: string[]
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
  }): FeeConfig {
    return new FeeConfig({
      id: row.id,
      organizationId: row.organizationId,
      hotelId: row.hotelId,
      name: row.name,
      description: row.description,
      type: row.type as FeeType,
      rate: Number(row.rate),
      appliesTo: row.appliesTo,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    })
  }
}
