import type Redis from 'ioredis'
import { Booking } from '../../domain/entities/Booking'
import { BookingRoom } from '../../domain/entities/BookingRoom'
import { BookingGuest } from '../../domain/entities/BookingGuest'
import type { FullBooking } from '../../domain/repositories/IBookingRepository'
import type { BookingProps } from '../../domain/entities/Booking'
import type { BookingRoomProps } from '../../domain/entities/BookingRoom'
import type { BookingGuestProps } from '../../domain/entities/BookingGuest'

interface SerializedCache {
  booking: BookingProps
  rooms: BookingRoomProps[]
  guests: BookingGuestProps[]
}

export class BookingCache {
  private readonly PREFIX = 'stayflexi:booking:cache'

  constructor(private readonly redis: Redis, private readonly ttlSeconds = 300) {}

  private key(bookingId: string) { return `${this.PREFIX}:${bookingId}` }

  async get(bookingId: string): Promise<FullBooking | null> {
    const raw = await this.redis.get(this.key(bookingId))
    if (!raw) return null
    try {
      const data = JSON.parse(raw) as SerializedCache
      // Rehydrate Dates from ISO strings
      data.booking.createdAt = new Date(data.booking.createdAt)
      data.booking.updatedAt = new Date(data.booking.updatedAt)
      if (data.booking.checkedInAt) data.booking.checkedInAt = new Date(data.booking.checkedInAt)
      if (data.booking.checkedOutAt) data.booking.checkedOutAt = new Date(data.booking.checkedOutAt)
      if (data.booking.cancelledAt) data.booking.cancelledAt = new Date(data.booking.cancelledAt)
      if (data.booking.deletedAt) data.booking.deletedAt = new Date(data.booking.deletedAt)

      return {
        booking: new Booking(data.booking),
        rooms: data.rooms.map(r => {
          r.checkInDate = new Date(r.checkInDate)
          r.checkOutDate = new Date(r.checkOutDate)
          return new BookingRoom(r)
        }),
        guests: data.guests.map(g => {
          if (g.dateOfBirth) g.dateOfBirth = new Date(g.dateOfBirth)
          return new BookingGuest(g)
        }),
      }
    } catch { return null }
  }

  async set(bookingId: string, data: FullBooking): Promise<void> {
    const serializable: SerializedCache = {
      booking: data.booking.toJSON(),
      rooms: data.rooms.map(r => r.toJSON()),
      guests: data.guests.map(g => g.toJSON()),
    }
    await this.redis.setex(this.key(bookingId), this.ttlSeconds, JSON.stringify(serializable))
  }

  async invalidate(bookingId: string): Promise<void> {
    await this.redis.del(this.key(bookingId))
  }
}
