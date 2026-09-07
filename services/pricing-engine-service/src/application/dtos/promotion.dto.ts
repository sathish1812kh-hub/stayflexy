import { z } from 'zod'

export const createPromotionDtoSchema = z
  .object({
    hotelId: z.string().uuid().optional().nullable(),
    code: z
      .string()
      .min(2)
      .max(50)
      .regex(/^[A-Z0-9_-]+$/i, 'Code must be alphanumeric'),
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional().nullable(),
    discountType: z.enum(['PERCENTAGE', 'FIXED']),
    discountValue: z.number().positive(),
    minNights: z.number().int().min(1).max(365).optional().default(1),
    validFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .transform((v) => new Date(v)),
    validTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .transform((v) => new Date(v)),
    maxUses: z.number().int().positive().optional().nullable(),
    isActive: z.boolean().optional().default(true),
  })
  .refine((d) => d.validTo >= d.validFrom, {
    message: 'validTo must be after validFrom',
    path: ['validTo'],
  })
  .refine((d) => d.discountType !== 'PERCENTAGE' || d.discountValue <= 100, {
    message: 'PERCENTAGE discount cannot exceed 100',
    path: ['discountValue'],
  })

export const updatePromotionDtoSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).nullable().optional(),
    discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
    discountValue: z.number().positive().optional(),
    minNights: z.number().int().min(1).max(365).optional(),
    validFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .transform((v) => (v ? new Date(v) : undefined)),
    validTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .transform((v) => (v ? new Date(v) : undefined)),
    maxUses: z.number().int().positive().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field required' })

export const listPromotionsDtoSchema = z.object({
  hotelId: z.string().uuid().optional(),
  isActive: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
  search: z.string().max(100).optional(),
  page: z.string().optional().default('1').transform(Number).pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform(Number)
    .pipe(z.number().int().min(1).max(100)),
})

export const redeemPromotionDtoSchema = z.object({
  code: z.string().min(1).max(50),
  hotelId: z.string().uuid().optional().nullable(),
  bookingId: z.string().uuid().optional().nullable(),
  guestId: z.string().uuid().optional().nullable(),
  baseAmount: z.number().nonnegative().optional(),
  nights: z.number().int().min(1).optional(),
})

export type CreatePromotionDto = z.infer<typeof createPromotionDtoSchema>
export type UpdatePromotionDto = z.infer<typeof updatePromotionDtoSchema>
export type ListPromotionsDto = z.infer<typeof listPromotionsDtoSchema>
export type RedeemPromotionDto = z.infer<typeof redeemPromotionDtoSchema>
