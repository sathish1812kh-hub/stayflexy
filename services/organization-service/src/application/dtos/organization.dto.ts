import { z } from 'zod'
import { emailSchema, slugSchema } from '@stayflexi/shared-validation'

export const createOrgDtoSchema = z.object({
  name: z.string().min(2).max(200),
  legalName: z.string().max(300).optional(),
  slug: slugSchema.optional(),
  email: emailSchema,
  phone: z.string().max(20).optional(),
  website: z.string().url().max(255).optional(),
  country: z
    .string()
    .length(2, 'Must be ISO 3166-1 alpha-2 country code')
    .toUpperCase(),
})
export type CreateOrgDto = z.infer<typeof createOrgDtoSchema>

export const updateOrgDtoSchema = z
  .object({
    name: z.string().min(2).max(200).optional(),
    legalName: z.string().max(300).optional(),
    email: emailSchema.optional(),
    phone: z.string().max(20).optional(),
    website: z.string().url().max(255).optional(),
    logoUrl: z.string().url().optional(),
    country: z.string().length(2).toUpperCase().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })
export type UpdateOrgDto = z.infer<typeof updateOrgDtoSchema>

export const addMemberDtoSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid().optional(),
})
export type AddMemberDto = z.infer<typeof addMemberDtoSchema>

export const listOrgsDtoSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform(Number)
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform(Number)
    .pipe(z.number().int().min(1).max(100)),
  status: z.string().optional(),
  plan: z.string().optional(),
})
export type ListOrgsDto = z.infer<typeof listOrgsDtoSchema>
