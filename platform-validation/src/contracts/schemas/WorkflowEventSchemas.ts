import { z } from 'zod'
import { createEnvelopeSchema } from './EventEnvelopeSchema'

export const WorkflowStartedPayloadSchema = z.object({
  executionId: z.string().uuid(),
  workflowName: z.string().min(1),
  triggerSource: z.string().min(1),
})

export const WorkflowCompletedPayloadSchema = WorkflowStartedPayloadSchema.extend({
  durationMs: z.number().nonnegative(),
  resultPayload: z.unknown().optional(),
})

export const WorkflowFailedPayloadSchema = WorkflowStartedPayloadSchema.extend({
  failureReason: z.string().min(1),
})

export type WorkflowStartedPayload = z.infer<typeof WorkflowStartedPayloadSchema>
export type WorkflowCompletedPayload = z.infer<typeof WorkflowCompletedPayloadSchema>
export type WorkflowFailedPayload = z.infer<typeof WorkflowFailedPayloadSchema>

export const WorkflowStartedEnvelopeSchema = createEnvelopeSchema(WorkflowStartedPayloadSchema)
export const WorkflowCompletedEnvelopeSchema = createEnvelopeSchema(WorkflowCompletedPayloadSchema)
export const WorkflowFailedEnvelopeSchema = createEnvelopeSchema(WorkflowFailedPayloadSchema)
