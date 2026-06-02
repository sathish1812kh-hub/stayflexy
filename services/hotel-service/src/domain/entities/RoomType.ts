export interface RoomTypeProps {
  id: string
  hotelId: string
  organizationId: string
  name: string
  description: string | null
  basePrice: number
  maxOccupancy: number
  maxAdults: number
  maxChildren: number
  maxInfants: number
  minChildAge: number
  maxChildAge: number
  minInfantAge: number
  maxInfantAge: number
  minOccupancy: number
  absoluteMax: number
  hourlyPrice: number | null
  extraBedPrice: number
  extraGuestPrice: number
  maxExtraBeds: number
  amenities: string[] | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export class RoomType {
  constructor(private readonly props: RoomTypeProps) {}

  get id(): string { return this.props.id }
  get hotelId(): string { return this.props.hotelId }
  get organizationId(): string { return this.props.organizationId }
  get name(): string { return this.props.name }
  get description(): string | null { return this.props.description }
  get basePrice(): number { return this.props.basePrice }
  get maxOccupancy(): number { return this.props.maxOccupancy }
  get maxAdults(): number { return this.props.maxAdults }
  get maxChildren(): number { return this.props.maxChildren }
  get maxInfants(): number { return this.props.maxInfants }
  get minChildAge(): number { return this.props.minChildAge }
  get maxChildAge(): number { return this.props.maxChildAge }
  get minInfantAge(): number { return this.props.minInfantAge }
  get maxInfantAge(): number { return this.props.maxInfantAge }
  get minOccupancy(): number { return this.props.minOccupancy }
  get absoluteMax(): number { return this.props.absoluteMax }
  get hourlyPrice(): number | null { return this.props.hourlyPrice }
  get extraBedPrice(): number { return this.props.extraBedPrice }
  get extraGuestPrice(): number { return this.props.extraGuestPrice }
  get maxExtraBeds(): number { return this.props.maxExtraBeds }
  get amenities(): string[] | null { return this.props.amenities }
  get isActive(): boolean { return this.props.isActive }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  belongsTo(organizationId: string): boolean {
    return this.props.organizationId === organizationId
  }

  toJSON(): RoomTypeProps {
    return { ...this.props }
  }
}
