import { z } from 'zod'

export const EventEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.string().min(1),
  aggregateId: z.string().min(1),
  aggregateType: z.string().min(1),
  organizationId: z.string().min(1),
  version: z.number().int().positive(),
  timestamp: z.string().datetime(),
  correlationId: z.string().optional(),
  causationId: z.string().optional(),
  payload: z.unknown(),
})

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>

export function createEnvelopeSchema<T extends z.ZodTypeAny>(payloadSchema: T) {
  return EventEnvelopeSchema.extend({ payload: payloadSchema })
}
