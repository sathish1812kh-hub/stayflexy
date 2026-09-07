export interface SeasonProps {
  id: string
  organizationId: string
  hotelId: string
  name: string
  code: string
  description: string | null
  startDate: Date
  endDate: Date
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export class Season {
  constructor(private readonly props: SeasonProps) {}

  get id(): string {
    return this.props.id
  }
  get organizationId(): string {
    return this.props.organizationId
  }
  get hotelId(): string {
    return this.props.hotelId
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
  get startDate(): Date {
    return this.props.startDate
  }
  get endDate(): Date {
    return this.props.endDate
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
  get deletedAt(): Date | null {
    return this.props.deletedAt
  }

  contains(date: Date): boolean {
    return date >= this.props.startDate && date <= this.props.endDate
  }

  toJSON(): SeasonProps {
    return { ...this.props }
  }
}
