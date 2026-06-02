export type HotelStatus = 'ACTIVE' | 'INACTIVE' | 'UNDER_RENOVATION'

export interface HotelProps {
  id: string
  organizationId: string
  name: string
  slug: string
  address: string | null
  city: string
  state: string | null
  country: string
  postalCode: string | null
  phone: string | null
  email: string | null
  website: string | null
  starRating: number | null
  status: HotelStatus
  timezone: string
  checkInTime: string
  checkOutTime: string
  metadata: Record<string, unknown> | null
  createdById: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export class Hotel {
  constructor(private readonly props: HotelProps) {}

  get id(): string { return this.props.id }
  get organizationId(): string { return this.props.organizationId }
  get name(): string { return this.props.name }
  get slug(): string { return this.props.slug }
  get address(): string | null { return this.props.address }
  get city(): string { return this.props.city }
  get state(): string | null { return this.props.state }
  get country(): string { return this.props.country }
  get postalCode(): string | null { return this.props.postalCode }
  get phone(): string | null { return this.props.phone }
  get email(): string | null { return this.props.email }
  get website(): string | null { return this.props.website }
  get starRating(): number | null { return this.props.starRating }
  get status(): HotelStatus { return this.props.status }
  get timezone(): string { return this.props.timezone }
  get checkInTime(): string { return this.props.checkInTime }
  get checkOutTime(): string { return this.props.checkOutTime }
  get metadata(): Record<string, unknown> | null { return this.props.metadata }
  get createdById(): string | null { return this.props.createdById }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }
  get deletedAt(): Date | null { return this.props.deletedAt }

  get isDeleted(): boolean { return this.props.deletedAt !== null }
  get isActive(): boolean { return this.props.status === 'ACTIVE' }

  belongsTo(organizationId: string): boolean {
    return this.props.organizationId === organizationId
  }

  toJSON(): HotelProps {
    return { ...this.props }
  }
}
