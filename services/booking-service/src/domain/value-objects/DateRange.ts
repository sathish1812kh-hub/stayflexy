export class DateRange {
  private constructor(
    private readonly _checkIn: Date,
    private readonly _checkOut: Date,
    private readonly _nightCount: number
  ) {}

  static create(checkIn: string | Date, checkOut: string | Date): DateRange {
    const ci = checkIn instanceof Date ? new Date(checkIn) : new Date(checkIn)
    const co = checkOut instanceof Date ? new Date(checkOut) : new Date(checkOut)
    if (isNaN(ci.getTime()) || isNaN(co.getTime())) throw new Error('Invalid date format')
    if (co <= ci) throw new Error('Check-out date must be after check-in date')
    const nightCount = Math.round((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24))
    if (nightCount < 1) throw new Error('Booking must be at least 1 night')
    return new DateRange(ci, co, nightCount)
  }

  get checkIn() { return this._checkIn }
  get checkOut() { return this._checkOut }
  get nightCount() { return this._nightCount }

  overlaps(other: DateRange): boolean {
    return this._checkIn < other._checkOut && this._checkOut > other._checkIn
  }

  isValidAdvanceBooking(maxDays: number): boolean {
    const daysUntilCheckIn = Math.ceil((this._checkIn.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return daysUntilCheckIn <= maxDays
  }

  eachDate(): Date[] {
    const dates: Date[] = []
    const current = new Date(this._checkIn)
    current.setUTCHours(0, 0, 0, 0)
    const end = new Date(this._checkOut)
    end.setUTCHours(0, 0, 0, 0)
    while (current < end) {
      dates.push(new Date(current))
      current.setUTCDate(current.getUTCDate() + 1)
    }
    return dates
  }
}
