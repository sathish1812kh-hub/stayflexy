import { z } from 'zod'

export const createRatePlanDtoSchema = z
  .object({
    hotelId: z.string().uuid(),
    roomTypeId: z.string().uuid().optional().nullable(),
    name: z.string().min(1).max(200),
    code: z
      .string()
      .min(1)
      .max(50)
      .regex(/^[A-Z0-9_-]+$/i, 'Code must be alphanumeric with _-'),
    description: z.string().max(500).optional().nullable(),
    seasonStart: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable()
      .transform((v) => (v ? new Date(v) : null)),
    seasonEnd: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable()
      .transform((v) => (v ? new Date(v) : null)),
    baseRate: z.number().positive(),
    currency: z.string().length(3).optional().default('USD'),
    minStay: z.number().int().min(1).max(365).optional().default(1),
    maxStay: z.number().int().min(1).max(365).optional().nullable(),
    closedToArrival: z.boolean().optional().default(false),
    closedToDeparture: z.boolean().optional().default(false),
    isActive: z.boolean().optional().default(true),
  })
  .refine(
    (data) => {
      if (data.seasonStart && data.seasonEnd) return data.seasonEnd >= data.seasonStart
      return true
    },
    { message: 'seasonEnd must be after seasonStart', path: ['seasonEnd'] },
  )

export const updateRatePlanDtoSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(500).nullable().optional(),
    seasonStart: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional()
      .transform((v) => (v ? new Date(v) : null)),
    seasonEnd: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional()
      .transform((v) => (v ? new Date(v) : null)),
    baseRate: z.number().positive().optional(),
    currency: z.string().length(3).optional(),
    minStay: z.number().int().min(1).max(365).optional(),
    maxStay: z.number().int().min(1).max(365).nullable().optional(),
    closedToArrival: z.boolean().optional(),
    closedToDeparture: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: 'At least one field required' })

export const listRatePlansDtoSchema = z.object({
  hotelId: z.string().uuid().optional(),
  roomTypeId: z.string().uuid().optional(),
  isActive: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  search: z.string().max(100).optional(),
  page: z.string().optional().default('1').transform(Number).pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform(Number)
    .pipe(z.number().int().min(1).max(100)),
})

export const createSeasonDtoSchema = z
  .object({
    hotelId: z.string().uuid(),
    name: z.string().min(1).max(100),
    code: z.string().min(1).max(50),
    description: z.string().max(500).optional().nullable(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .transform((v) => new Date(v)),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .transform((v) => new Date(v)),
    isActive: z.boolean().optional().default(true),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: 'endDate must be after startDate',
    path: ['endDate'],
  })

export const updateSeasonDtoSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).nullable().optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .transform((v) => (v ? new Date(v) : undefined)),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .transform((v) => (v ? new Date(v) : undefined)),
    isActive: z.boolean().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field required' })

export const createRestrictionDtoSchema = z.object({
  hotelId: z.string().uuid(),
  ratePlanId: z.string().uuid().optional().nullable(),
  roomTypeId: z.string().uuid().optional().nullable(),
  restrictionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .transform((v) => new Date(v)),
  minStay: z.number().int().min(1).nullable().optional(),
  maxStay: z.number().int().min(1).nullable().optional(),
  closedToArrival: z.boolean().optional().default(false),
  closedToDeparture: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
})

export const updateRestrictionDtoSchema = z
  .object({
    minStay: z.number().int().min(1).nullable().optional(),
    maxStay: z.number().int().min(1).nullable().optional(),
    closedToArrival: z.boolean().optional(),
    closedToDeparture: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field required' })

export type CreateRatePlanDto = z.infer<typeof createRatePlanDtoSchema>
export type UpdateRatePlanDto = z.infer<typeof updateRatePlanDtoSchema>
export type ListRatePlansDto = z.infer<typeof listRatePlansDtoSchema>
export type CreateSeasonDto = z.infer<typeof createSeasonDtoSchema>
export type UpdateSeasonDto = z.infer<typeof updateSeasonDtoSchema>
export type CreateRestrictionDto = z.infer<typeof createRestrictionDtoSchema>
export type UpdateRestrictionDto = z.infer<typeof updateRestrictionDtoSchema>
