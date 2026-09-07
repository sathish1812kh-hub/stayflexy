import { z } from 'zod'

export const createHousekeepingTaskDtoSchema = z.object({
  hotelId: z.string().uuid(),
  roomId: z.string().uuid(),
  assignedTo: z.string().uuid().optional().nullable(),
  taskType: z.enum([
    'STANDARD_CLEANING',
    'DEEP_CLEANING',
    'TURNDOWN',
    'INSPECTION',
    'LINEN_CHANGE',
    'BATHROOM_CLEANING',
    'CHECKOUT_CLEANING',
  ]),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional().default('NORMAL'),
  scheduledAt: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? new Date(v) : null)),
  notes: z.string().max(1000).optional().nullable(),
})

export const updateHousekeepingTaskDtoSchema = z
  .object({
    taskStatus: z.enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED']).optional(),
    assignedTo: z.string().uuid().nullable().optional(),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
    notes: z.string().max(1000).nullable().optional(),
    scheduledAt: z
      .string()
      .nullable()
      .optional()
      .transform((v) => (v ? new Date(v as string) : null)),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field required' })

export const assignHousekeepingTaskDtoSchema = z.object({
  assignedTo: z.string().uuid(),
})

export const listHousekeepingTasksDtoSchema = z.object({
  hotelId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  taskStatus: z.enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  page: z.string().optional().default('1').transform(Number).pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform(Number)
    .pipe(z.number().int().min(1).max(100)),
})

export type CreateHousekeepingTaskDto = z.infer<typeof createHousekeepingTaskDtoSchema>
export type UpdateHousekeepingTaskDto = z.infer<typeof updateHousekeepingTaskDtoSchema>
export type AssignHousekeepingTaskDto = z.infer<typeof assignHousekeepingTaskDtoSchema>
export type ListHousekeepingTasksDto = z.infer<typeof listHousekeepingTasksDtoSchema>
