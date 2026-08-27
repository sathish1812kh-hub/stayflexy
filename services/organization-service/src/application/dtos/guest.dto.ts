import { z } from 'zod'

export const createGuestSchema = z.object({
  organizationId: z.string().uuid(),
  hotelId: z.string().uuid().nullable().optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  nationality: z.string().max(100).nullable().optional(),
  dateOfBirth: z.string().datetime().nullable().optional(),
  governmentIdType: z
    .enum(['PASSPORT', 'NATIONAL_ID', 'DRIVERS_LICENSE', 'OTHER'])
    .nullable()
    .optional(),
  governmentIdNumber: z.string().max(100).nullable().optional(),
  preferences: z.record(z.unknown()).nullable().optional(),
  loyaltyTier: z.string().max(50).nullable().optional(),
  loyaltyPoints: z.number().int().nonnegative().optional().default(0),
  metadata: z.record(z.unknown()).nullable().optional(),
})

export const updateGuestSchema = createGuestSchema.partial()

export type CreateGuestDto = z.infer<typeof createGuestSchema>
export type UpdateGuestDto = z.infer<typeof updateGuestSchema>

export const listGuestsQuerySchema = z.object({
  hotelId: z.string().uuid().nullable().optional(),
  search: z.string().optional(),
  loyaltyTier: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type ListGuestsQuery = z.infer<typeof listGuestsQuerySchema>
