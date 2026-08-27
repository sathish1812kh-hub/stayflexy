import { z } from 'zod'

export const taxTypeEnum = z.enum(['PERCENTAGE', 'FIXED', 'PER_NIGHT', 'PER_PERSON'])
export const feeTypeEnum = z.enum(['PERCENTAGE', 'FIXED', 'PER_NIGHT', 'PER_PERSON'])

export const createTaxConfigSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  hotelId: z.string().uuid().nullable().optional(),
  type: taxTypeEnum.default('PERCENTAGE'),
  rate: z.coerce.number().min(0).max(10000),
  appliesTo: z.array(z.string()).default(['ROOM']),
  isActive: z.boolean().default(true),
})

export const updateTaxConfigSchema = createTaxConfigSchema.partial()

export const listTaxConfigsQuerySchema = z.object({
  hotelId: z.string().uuid().nullable().optional(),
  isActive: z
    .string()
    .optional()
    .transform((v) => {
      if (v === 'true') return true
      if (v === 'false') return false
      return undefined
    }),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type CreateTaxConfigDto = z.infer<typeof createTaxConfigSchema>
export type UpdateTaxConfigDto = z.infer<typeof updateTaxConfigSchema>
export type ListTaxConfigsQuery = z.infer<typeof listTaxConfigsQuerySchema>

// ─── FeeConfig DTOs (re-use enums, separate schemas for clarity) ───────────

export const createFeeConfigSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  hotelId: z.string().uuid().nullable().optional(),
  type: feeTypeEnum.default('FIXED'),
  rate: z.coerce.number().min(0).max(10000),
  appliesTo: z.array(z.string()).default(['ROOM']),
  isActive: z.boolean().default(true),
})

export const updateFeeConfigSchema = createFeeConfigSchema.partial()

export const listFeeConfigsQuerySchema = z.object({
  hotelId: z.string().uuid().nullable().optional(),
  isActive: z
    .string()
    .optional()
    .transform((v) => {
      if (v === 'true') return true
      if (v === 'false') return false
      return undefined
    }),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type CreateFeeConfigDto = z.infer<typeof createFeeConfigSchema>
export type UpdateFeeConfigDto = z.infer<typeof updateFeeConfigSchema>
export type ListFeeConfigsQuery = z.infer<typeof listFeeConfigsQuerySchema>
