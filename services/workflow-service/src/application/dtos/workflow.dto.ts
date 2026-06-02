import { z } from 'zod'

export const createWorkflowDtoSchema = z.object({
  workflowName: z.string().min(1).max(200),
  triggerSource: z.string().min(1).max(100),
  hotelId: z.string().uuid().optional(),
  context: z.record(z.unknown()).default({}),
  idempotencyKey: z.string().max(255).optional(),
})

export const executeWorkflowDtoSchema = z.object({
  automationRuleId: z.string().uuid().optional(),
  workflowName: z.string().min(1).max(200),
  triggerSource: z.string().min(1),
  hotelId: z.string().uuid().optional(),
  context: z.record(z.unknown()).default({}),
  idempotencyKey: z.string().max(255).optional(),
})

export const createRuleDtoSchema = z.object({
  hotelId: z.string().uuid(),
  ruleName: z.string().min(1).max(200),
  triggerType: z.enum([
    'BOOKING_CREATED',
    'BOOKING_CANCELLED',
    'PAYMENT_COMPLETED',
    'PAYMENT_FAILED',
    'INVENTORY_LOW',
    'OCCUPANCY_THRESHOLD',
    'OTA_SYNC_FAILED',
    'HOUSEKEEPING_COMPLETED',
    'MAINTENANCE_OPENED',
    'SCHEDULED',
    'MANUAL',
  ]),
  conditionPayload: z
    .array(
      z.object({
        field: z.string(),
        operator: z.string(),
        value: z.unknown().optional(),
      }),
    )
    .default([]),
  actionPayload: z.object({
    type: z.string(),
    params: z.record(z.unknown()).default({}),
  }),
  priority: z.number().int().min(0).max(100).optional().default(0),
})

export const listWorkflowsQuerySchema = z.object({
  hotelId: z.string().uuid().optional(),
  executionStatus: z.string().optional(),
  triggerSource: z.string().optional(),
  workflowName: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform(v => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform(v => (v ? Math.min(parseInt(v, 10), 100) : 20))
    .pipe(z.number().int().min(1)),
})

export type CreateWorkflowDto = z.infer<typeof createWorkflowDtoSchema>
export type ExecuteWorkflowDto = z.infer<typeof executeWorkflowDtoSchema>
export type CreateRuleDto = z.infer<typeof createRuleDtoSchema>
export type ListWorkflowsQuery = z.infer<typeof listWorkflowsQuerySchema>
