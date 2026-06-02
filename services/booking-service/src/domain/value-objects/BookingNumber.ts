export class BookingNumber {
  private constructor(private readonly value: string) {}

  static generate(prefix = 'BK'): BookingNumber {
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).slice(2, 6).toUpperCase()
    return new BookingNumber(`${prefix.slice(0, 4).toUpperCase()}-${timestamp}-${random}`)
  }

  static from(value: string): BookingNumber {
    if (!value || value.length < 3) throw new Error('Invalid booking number')
    return new BookingNumber(value)
  }

  toString(): string { return this.value }
}
