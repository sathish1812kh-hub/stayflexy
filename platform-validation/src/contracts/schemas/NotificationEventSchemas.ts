import { z } from 'zod'
import { createEnvelopeSchema } from './EventEnvelopeSchema'

export const NotificationSentPayloadSchema = z.object({
  notificationId: z.string().uuid(),
  channelType: z.enum(['EMAIL', 'SMS', 'PUSH', 'WHATSAPP']),
  recipient: z.string().min(1),
  organizationId: z.string().min(1),
})

export const NotificationFailedPayloadSchema = NotificationSentPayloadSchema.extend({
  failureReason: z.string().min(1),
})

export const NotificationDeliveredPayloadSchema = NotificationSentPayloadSchema

export type NotificationSentPayload = z.infer<typeof NotificationSentPayloadSchema>
export type NotificationFailedPayload = z.infer<typeof NotificationFailedPayloadSchema>
export type NotificationDeliveredPayload = z.infer<typeof NotificationDeliveredPayloadSchema>

export const NotificationSentEnvelopeSchema = createEnvelopeSchema(NotificationSentPayloadSchema)
export const NotificationFailedEnvelopeSchema = createEnvelopeSchema(NotificationFailedPayloadSchema)
export const NotificationDeliveredEnvelopeSchema = createEnvelopeSchema(NotificationDeliveredPayloadSchema)
