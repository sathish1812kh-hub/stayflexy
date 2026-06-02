import { z } from 'zod'

export const sendNotificationDtoSchema = z.object({
  organizationId: z.string().uuid(),
  hotelId: z.string().uuid().optional(),
  notificationType: z.enum(['EMAIL', 'SMS', 'WHATSAPP', 'IN_APP', 'PUSH']),
  recipient: z.string().min(1).max(255),
  subject: z.string().max(500).optional(),
  message: z.string().min(1).max(10000),
  templateId: z.string().uuid().optional(),
  templateVariables: z.record(z.string()).optional(),
  scheduledAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
})

export const listNotificationsQuerySchema = z.object({
  hotelId: z.string().uuid().optional(),
  notificationType: z.enum(['EMAIL', 'SMS', 'WHATSAPP', 'IN_APP', 'PUSH']).optional(),
  deliveryStatus: z
    .enum(['PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED'])
    .optional(),
  page: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseInt(v, 10) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? Math.min(parseInt(v, 10), 100) : 20))
    .pipe(z.number().int().min(1)),
})

export const createTemplateDtoSchema = z.object({
  templateName: z.string().min(1).max(100),
  templateType: z.enum(['EMAIL', 'SMS', 'WHATSAPP', 'IN_APP', 'PUSH']),
  subjectTemplate: z.string().max(500).optional(),
  bodyTemplate: z.string().min(1),
  variables: z.array(z.string()).optional().default([]),
})

export type SendNotificationDto = z.infer<typeof sendNotificationDtoSchema>
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>
export type CreateTemplateDto = z.infer<typeof createTemplateDtoSchema>
