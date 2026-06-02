export type GovIdType = 'PASSPORT' | 'NATIONAL_ID' | 'DRIVERS_LICENSE' | 'OTHER'

export interface BookingGuestProps {
  id: string
  bookingId: string
  isPrimary: boolean
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  nationality: string | null
  governmentIdType: GovIdType | null
  governmentIdNumber: string | null
  dateOfBirth: Date | null
}

export class BookingGuest {
  constructor(private readonly props: BookingGuestProps) {}
  get id() { return this.props.id }
  get bookingId() { return this.props.bookingId }
  get isPrimary() { return this.props.isPrimary }
  get firstName() { return this.props.firstName }
  get lastName() { return this.props.lastName }
  get fullName() { return `${this.props.firstName} ${this.props.lastName}` }
  get email() { return this.props.email }
  get phone() { return this.props.phone }
  get nationality() { return this.props.nationality }
  get governmentIdType() { return this.props.governmentIdType }
  get governmentIdNumber() { return this.props.governmentIdNumber }
  get dateOfBirth() { return this.props.dateOfBirth }
  toJSON() { return { ...this.props } }
}
