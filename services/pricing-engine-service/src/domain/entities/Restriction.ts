export interface RestrictionProps {
  id: string
  organizationId: string
  hotelId: string
  ratePlanId: string | null
  roomTypeId: string | null
  restrictionDate: Date
  minStay: number | null
  maxStay: number | null
  closedToArrival: boolean
  closedToDeparture: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export class Restriction {
  constructor(private readonly props: RestrictionProps) {}

  get id(): string {
    return this.props.id
  }
  get organizationId(): string {
    return this.props.organizationId
  }
  get hotelId(): string {
    return this.props.hotelId
  }
  get ratePlanId(): string | null {
    return this.props.ratePlanId
  }
  get roomTypeId(): string | null {
    return this.props.roomTypeId
  }
  get restrictionDate(): Date {
    return this.props.restrictionDate
  }
  get minStay(): number | null {
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
  get createdAt(): Date {
    return this.props.createdAt
  }
  get updatedAt(): Date {
    return this.props.updatedAt
  }

  isClosedToArrival(): boolean {
    return this.props.closedToArrival && this.props.isActive
  }
  isClosedToDeparture(): boolean {
    return this.props.closedToDeparture && this.props.isActive
  }

  toJSON(): RestrictionProps {
    return { ...this.props }
  }
}
