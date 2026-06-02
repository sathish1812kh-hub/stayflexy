import { ZodSchema, ZodError, z } from 'zod'

export { z }
export type { ZodSchema }

export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: Array<{ field: string; message: string }>
}

export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }))
    const err = new Error(
      `Validation failed: ${errors.map((e) => `${e.field}: ${e.message}`).join(', ')}`
    ) as Error & {
      statusCode: number
      code: string
      details: typeof errors
    }
    err.statusCode = 422
    err.code = 'VALIDATION_ERROR'
    err.details = errors
    throw err
  }
  return result.data
}

export function validatePartial<T extends object>(
  schema: ZodSchema<T>,
  data: unknown
): Partial<T> {
  const partialSchema = (schema as unknown as z.ZodObject<z.ZodRawShape>).partial()
  return validate(partialSchema, data) as Partial<T>
}

// Common reusable schemas
export const uuidSchema = z.string().uuid('Must be a valid UUID')
export const emailSchema = z
  .string()
  .email('Must be a valid email address')
  .toLowerCase()
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
export const slugSchema = z
  .string()
  .regex(
    /^[a-z0-9-]+$/,
    'Slug must contain only lowercase letters, numbers, and hyphens'
  )
  .min(2)
  .max(64)
export const paginationSchema = z.object({
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
})
