import type { ValidationResult } from '../types/index'
import { ContractValidator } from '../contracts/ContractValidator'
import { createEnvelopeSchema } from '../contracts/schemas/EventEnvelopeSchema'
import {
  BookingCreatedPayloadSchema,
  BookingCancelledPayloadSchema,
} from '../contracts/schemas/BookingEventSchemas'
import { PaymentInitiatedPayloadSchema } from '../contracts/schemas/PaymentEventSchemas'
import {
  WorkflowStartedPayloadSchema,
  WorkflowCompletedPayloadSchema,
} from '../contracts/schemas/WorkflowEventSchemas'
import { NotificationSentPayloadSchema } from '../contracts/schemas/NotificationEventSchemas'

export class EventContractValidator {
  private readonly validator = new ContractValidator()

  validateBookingCreatedEvent(envelope: unknown): ValidationResult {
    return this.validator.validateEnvelope(
      envelope,
      createEnvelopeSchema(BookingCreatedPayloadSchema),
      'BookingCreatedEvent',
    )
  }

  validateBookingCancelledEvent(envelope: unknown): ValidationResult {
    return this.validator.validateEnvelope(
      envelope,
      createEnvelopeSchema(BookingCancelledPayloadSchema),
      'BookingCancelledEvent',
    )
  }

  validatePaymentInitiatedEvent(envelope: unknown): ValidationResult {
    return this.validator.validateEnvelope(
      envelope,
      createEnvelopeSchema(PaymentInitiatedPayloadSchema),
      'PaymentInitiatedEvent',
    )
  }

  validateWorkflowStartedEvent(envelope: unknown): ValidationResult {
    return this.validator.validateEnvelope(
      envelope,
      createEnvelopeSchema(WorkflowStartedPayloadSchema),
      'WorkflowStartedEvent',
    )
  }

  validateWorkflowCompletedEvent(envelope: unknown): ValidationResult {
    return this.validator.validateEnvelope(
      envelope,
      createEnvelopeSchema(WorkflowCompletedPayloadSchema),
      'WorkflowCompletedEvent',
    )
  }

  validateNotificationSentEvent(envelope: unknown): ValidationResult {
    return this.validator.validateEnvelope(
      envelope,
      createEnvelopeSchema(NotificationSentPayloadSchema),
      'NotificationSentEvent',
    )
  }

  validateEventIdempotency(envelopes: Array<{ eventId: string }>): ValidationResult {
    return this.validator.validateNoDuplicateEventIds(envelopes)
  }

  validateEventOrdering(events: Array<{ timestamp: string; eventId: string }>): ValidationResult {
    return this.validator.validateEventOrdering(events)
  }
}
