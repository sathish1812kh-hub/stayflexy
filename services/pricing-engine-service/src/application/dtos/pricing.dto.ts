import { z } from 'zod'

export const updatePricingRuleDtoSchema = z
  .object({
    ruleName: z.string().min(1).max(200).optional(),
    adjustmentType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'MULTIPLIER']).optional(),
    adjustmentValue: z.number().optional(),
    minimumPrice: z.number().nonnegative().nullable().optional(),
    maximumPrice: z.number().nonnegative().nullable().optional(),
    applicableDays: z.array(z.number().int().min(0).max(6)).optional(),
    applicableSeasons: z.array(z.string()).optional(),
    activeFrom: z.string().datetime().nullable().optional(),
    activeTo: z.string().datetime().nullable().optional(),
    priority: z.number().int().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED']).optional(),
  })
  .strict()

export type UpdatePricingRuleDto = z.infer<typeof updatePricingRuleDtoSchema>
