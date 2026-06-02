import { z } from 'zod'
import { createEnvelopeSchema } from './EventEnvelopeSchema'

export const BookingCreatedPayloadSchema = z.object({
  bookingId: z.string().uuid(),
  bookingNumber: z.string().min(1),
  hotelId: z.string().min(1),
  roomIds: z.array(z.string().min(1)),
  primaryGuestName: z.string().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  nightCount: z.number().int().positive(),
  totalAmount: z.number().positive(),
  currency: z.string().length(3),
  source: z.string().min(1),
  bookedById: z.string().min(1),
})

export const BookingCancelledPayloadSchema = z.object({
  bookingId: z.string().uuid(),
  bookingNumber: z.string().min(1),
  cancellationReason: z.string().min(1),
  cancelledById: z.string().min(1),
})

export const BookingCheckedInPayloadSchema = z.object({
  bookingId: z.string().uuid(),
  bookingNumber: z.string().min(1),
  hotelId: z.string().min(1),
})

export const BookingCheckedOutPayloadSchema = z.object({
  bookingId: z.string().uuid(),
  bookingNumber: z.string().min(1),
  hotelId: z.string().min(1),
})

export type BookingCreatedPayload = z.infer<typeof BookingCreatedPayloadSchema>
export type BookingCancelledPayload = z.infer<typeof BookingCancelledPayloadSchema>
export type BookingCheckedInPayload = z.infer<typeof BookingCheckedInPayloadSchema>
export type BookingCheckedOutPayload = z.infer<typeof BookingCheckedOutPayloadSchema>

export const BookingCreatedEnvelopeSchema = createEnvelopeSchema(BookingCreatedPayloadSchema)
export const BookingCancelledEnvelopeSchema = createEnvelopeSchema(BookingCancelledPayloadSchema)
export const BookingCheckedInEnvelopeSchema = createEnvelopeSchema(BookingCheckedInPayloadSchema)
export const BookingCheckedOutEnvelopeSchema = createEnvelopeSchema(BookingCheckedOutPayloadSchema)
