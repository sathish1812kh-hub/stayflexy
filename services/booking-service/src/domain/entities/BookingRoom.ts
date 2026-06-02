export type BookingRoomStatus = 'RESERVED' | 'OCCUPIED' | 'VACATED' | 'CANCELLED'

export interface BookingRoomProps {
  id: string
  bookingId: string
  roomId: string
  roomTypeId: string
  hotelId: string
  checkInDate: Date
  checkOutDate: Date
  nightCount: number
  adultCount: number
  childCount: number
  roomRate: number
  totalRoomAmount: number
  status: BookingRoomStatus
}

export class BookingRoom {
  constructor(private readonly props: BookingRoomProps) {}
  get id() { return this.props.id }
  get bookingId() { return this.props.bookingId }
  get roomId() { return this.props.roomId }
  get roomTypeId() { return this.props.roomTypeId }
  get hotelId() { return this.props.hotelId }
  get checkInDate() { return this.props.checkInDate }
  get checkOutDate() { return this.props.checkOutDate }
  get nightCount() { return this.props.nightCount }
  get adultCount() { return this.props.adultCount }
  get childCount() { return this.props.childCount }
  get roomRate() { return this.props.roomRate }
  get totalRoomAmount() { return this.props.totalRoomAmount }
  get status() { return this.props.status }
  get isActive() { return this.props.status !== 'CANCELLED' && this.props.status !== 'VACATED' }
  toJSON() { return { ...this.props } }
}
