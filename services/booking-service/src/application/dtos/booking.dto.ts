import { z } from 'zod'

const uuidSchema = z.string().uuid()
const BookingSourceEnum = z.enum(['DIRECT', 'OTA', 'WALK_IN', 'PHONE', 'EMAIL', 'AGENT', 'ONLINE'])
const CancellationReasonEnum = z.enum(['GUEST_REQUEST', 'NO_SHOW', 'HOTEL_REQUEST', 'FORCE_MAJEURE', 'DUPLICATE_BOOKING', 'OTHER'])
const GovIdTypeEnum = z.enum(['PASSPORT', 'NATIONAL_ID', 'DRIVERS_LICENSE', 'OTHER'])

export const guestInfoSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  nationality: z.string().length(2).optional(),
  governmentIdType: GovIdTypeEnum.optional(),
  governmentIdNumber: z.string().max(100).optional(),
  dateOfBirth: z.string().optional().transform(v => v ? new Date(v) : undefined),
})
export type GuestInfoDto = z.infer<typeof guestInfoSchema>

export const roomAllocationSchema = z.object({
  roomId: uuidSchema,
  roomTypeId: uuidSchema,
  adultCount: z.number().int().min(1).max(20),
  childCount: z.number().int().min(0).max(10).default(0),
})
export type RoomAllocationDto = z.infer<typeof roomAllocationSchema>

export const createBookingSchema = z.object({
  hotelId: uuidSchema,
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  rooms: z.array(roomAllocationSchema).min(1).max(10),
  guests: z.array(guestInfoSchema).min(1),
  source: BookingSourceEnum.default('DIRECT'),
  specialRequests: z.string().max(2000).optional(),
  currency: z.string().length(3).default('USD'),
  idempotencyKey: z.string().max(255).optional(),
})
export type CreateBookingDto = z.infer<typeof createBookingSchema>

export const patchBookingSchema = z.object({
  specialRequests: z.string().max(2000).optional(),
  internalNotes: z.string().max(2000).optional(),
}).refine(d => Object.values(d).some(v => v !== undefined), { message: 'At least one field required' })
export type PatchBookingDto = z.infer<typeof patchBookingSchema>

export const cancelBookingSchema = z.object({
  cancellationReason: CancellationReasonEnum,
  cancellationNote: z.string().max(1000).optional(),
})
export type CancelBookingDto = z.infer<typeof cancelBookingSchema>

export const searchBookingSchema = z.object({
  hotelId: uuidSchema.optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW']).optional(),
  source: BookingSourceEnum.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  guestEmail: z.string().email().optional(),
  guestName: z.string().optional(),
  bookingNumber: z.string().optional(),
  page: z.string().default('1').transform(Number).pipe(z.number().int().min(1)),
  limit: z.string().default('20').transform(Number).pipe(z.number().int().min(1).max(100)),
})
export type SearchBookingDto = z.infer<typeof searchBookingSchema>
