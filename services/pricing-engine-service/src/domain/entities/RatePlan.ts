export interface RatePlanProps {
  id: string
  organizationId: string
  hotelId: string
  roomTypeId: string | null
  name: string
  code: string
  description: string | null
  seasonStart: Date | null
  seasonEnd: Date | null
  baseRate: number
  currency: string
  minStay: number
  maxStay: number | null
  closedToArrival: boolean
  closedToDeparture: boolean
  isActive: boolean
  createdById: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export class RatePlan {
  constructor(private readonly props: RatePlanProps) {}

  get id(): string {
    return this.props.id
  }
  get organizationId(): string {
    return this.props.organizationId
  }
  get hotelId(): string {
    return this.props.hotelId
  }
  get roomTypeId(): string | null {
    return this.props.roomTypeId
  }
  get name(): string {
    return this.props.name
  }
  get code(): string {
    return this.props.code
  }
  get description(): string | null {
    return this.props.description
  }
  get seasonStart(): Date | null {
    return this.props.seasonStart
  }
  get seasonEnd(): Date | null {
    return this.props.seasonEnd
  }
  get baseRate(): number {
    return this.props.baseRate
  }
  get currency(): string {
    return this.props.currency
  }
  get minStay(): number {
    return this.props.minStay
  }
  get maxStay(): number | null {
    return this.props.maxStay
  }
  get closedToArrival(): boolean {
    return this.props.closedToArrival
  }
  get closedToDeparture(): boolean {
    return this.props.closedToDeparture
  }
  get isActive(): boolean {
    return this.props.isActive
  }
  get createdById(): string | null {
    return this.props.createdById
  }
  get createdAt(): Date {
    return this.props.createdAt
  }
  get updatedAt(): Date {
    return this.props.updatedAt
  }
  get deletedAt(): Date | null {
    return this.props.deletedAt
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== null
  }

  isAvailableForDate(date: Date): boolean {
    if (!this.props.isActive || this.isDeleted) return false
    if (this.props.seasonStart && date < this.props.seasonStart) return false
    if (this.props.seasonEnd && date > this.props.seasonEnd) return false
    return true
  }

  belongsToOrganization(orgId: string): boolean {
    return this.props.organizationId === orgId
  }

  toJSON(): RatePlanProps {
    return { ...this.props }
  }
}
