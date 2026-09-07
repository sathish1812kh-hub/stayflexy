import { z } from 'zod'

export const createFolioDtoSchema = z.object({
  hotelId: z.string().uuid(),
  bookingId: z.string().uuid(),
  folioNumber: z.string().min(1).max(50).optional(),
  currency: z.string().length(3).optional().default('USD'),
})

export const addFolioEntryDtoSchema = z.object({
  entryType: z.enum(['CHARGE', 'PAYMENT', 'ADJUSTMENT', 'REFUND', 'TAX', 'FEE']),
  description: z.string().min(1).max(500),
  amount: z.number(),
  referenceId: z.string().max(255).optional().nullable(),
  referenceType: z.string().max(100).optional().nullable(),
})

export const listFoliosDtoSchema = z.object({
  hotelId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  status: z.enum(['OPEN', 'CLOSED', 'VOID']).optional(),
  page: z.string().optional().default('1').transform(Number).pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform(Number)
    .pipe(z.number().int().min(1).max(100)),
})

export const createNightAuditDtoSchema = z.object({
  hotelId: z.string().uuid(),
  auditDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .transform((v) => new Date(v)),
})

export const listNightAuditsDtoSchema = z.object({
  hotelId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED']).optional(),
  page: z.string().optional().default('1').transform(Number).pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform(Number)
    .pipe(z.number().int().min(1).max(100)),
})

export type CreateFolioDto = z.infer<typeof createFolioDtoSchema>
export type AddFolioEntryDto = z.infer<typeof addFolioEntryDtoSchema>
export type ListFoliosDto = z.infer<typeof listFoliosDtoSchema>
export type CreateNightAuditDto = z.infer<typeof createNightAuditDtoSchema>
export type ListNightAuditsDto = z.infer<typeof listNightAuditsDtoSchema>
