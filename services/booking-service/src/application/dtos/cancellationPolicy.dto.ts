import { z } from 'zod'

export const createCancellationPolicySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  hotelId: z.string().uuid().nullable().optional(),
  noticeHours: z.coerce.number().int().nonnegative().default(24),
  penaltyPercent: z.coerce.number().min(0).max(100).default(0),
  refundMethod: z
    .enum(['ORIGINAL_PAYMENT', 'CREDIT', 'CASH', 'VOUCHER'])
    .default('ORIGINAL_PAYMENT'),
  nonRefundableAfter: z.string().datetime().nullable().optional(),
  isDefault: z.boolean().default(false),
  appliesToSources: z.array(z.string()).default(['DIRECT']),
  appliesToRatePlans: z.array(z.string()).default([]),
})

export const updateCancellationPolicySchema = createCancellationPolicySchema.partial()

export const listCancellationPoliciesQuerySchema = z.object({
  hotelId: z.string().uuid().nullable().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type CreateCancellationPolicyDto = z.infer<typeof createCancellationPolicySchema>
export type UpdateCancellationPolicyDto = z.infer<typeof updateCancellationPolicySchema>
export type ListCancellationPoliciesQuery = z.infer<typeof listCancellationPoliciesQuerySchema>
