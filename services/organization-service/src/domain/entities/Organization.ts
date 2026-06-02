export type OrgPlan = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
export type OrgStatus = 'ACTIVE' | 'PENDING_SETUP' | 'SUSPENDED' | 'CANCELLED'

export interface OrganizationProps {
  id: string
  name: string
  legalName: string | null
  slug: string
  plan: OrgPlan
  status: OrgStatus
  email: string
  phone: string | null
  website: string | null
  logoUrl: string | null
  ownerId: string
  country: string
  maxHotels: number
  metadata: Record<string, unknown> | null
  createdById: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export class Organization {
  constructor(private readonly props: OrganizationProps) {}

  get id(): string { return this.props.id }
  get name(): string { return this.props.name }
  get legalName(): string | null { return this.props.legalName }
  get slug(): string { return this.props.slug }
  get plan(): OrgPlan { return this.props.plan }
  get status(): OrgStatus { return this.props.status }
  get email(): string { return this.props.email }
  get phone(): string | null { return this.props.phone }
  get website(): string | null { return this.props.website }
  get logoUrl(): string | null { return this.props.logoUrl }
  get ownerId(): string { return this.props.ownerId }
  get country(): string { return this.props.country }
  get maxHotels(): number { return this.props.maxHotels }
  get metadata(): Record<string, unknown> | null { return this.props.metadata }
  get createdById(): string | null { return this.props.createdById }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }
  get deletedAt(): Date | null { return this.props.deletedAt }

  get isDeleted(): boolean { return this.props.deletedAt !== null }
  get isActive(): boolean { return this.props.status === 'ACTIVE' }

  isOwnedBy(userId: string): boolean {
    return this.props.ownerId === userId
  }

  toJSON(): OrganizationProps {
    return { ...this.props }
  }
}
