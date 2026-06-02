import { createHmac, timingSafeEqual } from 'crypto'
import type { Request, Response, NextFunction } from 'express'
import type { IPaymentRepository } from '../../domain/repositories/IPaymentRepository'
import type { PaymentIdempotencyStore } from '../../infrastructure/idempotency/PaymentIdempotencyStore'
import type { PaymentCache } from '../../infrastructure/cache/PaymentCache'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

type WebhookEventType =
  | 'payment.authorized'
  | 'payment.captured'
  | 'payment.failed'
  | 'payment.refunded'
  | 'payment.cancelled'

interface WebhookPayload {
  eventId: string
  eventType: WebhookEventType
  paymentReference?: string
  transactionId?: string
  amount?: number
  currency?: string
  failureReason?: string
  metadata?: Record<string, unknown>
}

export class WebhookController {
  constructor(
    private readonly paymentRepo: IPaymentRepository,
    private readonly idempotencyStore: PaymentIdempotencyStore,
    private readonly cache: PaymentCache,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger,
    private readonly webhookSecret: string
  ) {}

  // Webhook endpoint receives raw body (express.raw middleware used in route registration)
  handleWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const correlationId = req.headers['x-correlation-id'] as string | undefined

    try {
      // 1. Verify signature
      const rawBody = req.body as Buffer
      const signature = req.headers['x-webhook-signature'] as string | undefined

      if (!this.verifySignature(rawBody, signature)) {
        this.logger.warn({ correlationId, hasSignature: !!signature }, 'Webhook signature verification failed')
        res.status(401).json({
          success: false,
          error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed', statusCode: 401 },
        })
        return
      }

      // 2. Parse body
      let payload: WebhookPayload
      try {
        payload = JSON.parse(rawBody.toString()) as WebhookPayload
      } catch {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PAYLOAD', message: 'Invalid JSON payload', statusCode: 400 },
        })
        return
      }

      if (!payload.eventId || !payload.eventType) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'eventId and eventType are required', statusCode: 400 },
        })
        return
      }

      // 3. Idempotency — replay prevention
      const idempotencyKey = `webhook:${payload.eventId}`
      const existing = await this.idempotencyStore.get(idempotencyKey).catch(() => null)
      if (existing !== null && existing !== 'PROCESSING') {
        this.logger.info({ eventId: payload.eventId }, 'Webhook already processed — returning cached response')
        if (typeof existing === 'object' && 'body' in existing) {
          res.status(200).json(existing.body)
        } else {
          res.status(200).json({ success: true, data: { acknowledged: true, duplicate: true } })
        }
        return
      }

      const claimed = await this.idempotencyStore.markProcessing(idempotencyKey).catch(() => false)
      if (!claimed) {
        res.status(409).json({
          success: false,
          error: { code: 'PROCESSING', message: 'Webhook already being processed', statusCode: 409 },
        })
        return
      }

      // 4. Process webhook
      await this.processWebhook(payload, correlationId)

      const responseBody = { success: true, data: { acknowledged: true, eventId: payload.eventId } }
      await this.idempotencyStore.store(idempotencyKey, {
        statusCode: 200,
        body: responseBody,
        createdAt: new Date().toISOString(),
      }).catch(() => undefined)

      res.status(200).json(responseBody)
    } catch (err) {
      next(err)
    }
  }

  private verifySignature(rawBody: Buffer, signature: string | undefined): boolean {
    if (!signature) return false
    // Accept "sha256=<hex>" format (GitHub-style) or plain hex
    const rawSig = signature.startsWith('sha256=') ? signature.slice(7) : signature
    const expected = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex')
    try {
      return timingSafeEqual(Buffer.from(rawSig, 'hex'), Buffer.from(expected, 'hex'))
    } catch {
      return false
    }
  }

  private async processWebhook(payload: WebhookPayload, correlationId?: string): Promise<void> {
    const { eventType, paymentReference, transactionId, failureReason } = payload

    // Locate payment by reference or transactionId
    let payment = null
    if (paymentReference) {
      payment = await this.paymentRepo.findByReference(paymentReference)
    }
    if (!payment && transactionId) {
      // fallback: search by transactionId via reference lookup — log for now
      this.logger.warn({ transactionId, eventType }, 'Webhook payment lookup by transactionId not directly supported — skipping')
    }

    if (!payment) {
      this.logger.warn({ paymentReference, transactionId, eventType, correlationId }, 'Webhook received for unknown payment — audit only')
      return
    }

    const { id: paymentId, organizationId } = payment

    switch (eventType) {
      case 'payment.authorized':
        if (payment.isPending) {
          await this.paymentRepo.updateStatus(paymentId, 'PROCESSING')
          await this.paymentRepo.addAuditEntry(paymentId, 'PROCESSING', 'Payment authorized via webhook', 'system', { webhookEventType: eventType })
        }
        break

      case 'payment.captured':
        if (payment.isPending || payment.paymentStatus === 'PROCESSING') {
          await this.paymentRepo.updateStatus(paymentId, 'SUCCESS', {
            paidAt: new Date(),
            transactionId: payload.transactionId ?? payment.transactionId ?? undefined,
          })
          await this.paymentRepo.addAuditEntry(paymentId, 'SUCCESS', 'Payment captured via webhook', 'system', { webhookEventType: eventType })
          await this.cache.invalidatePayment(paymentId)
          this.eventPublisher.publish('payment.events', {
            eventType: 'payment.completed',
            aggregateId: paymentId,
            aggregateType: 'Payment',
            organizationId,
            correlationId,
            payload: { paymentId, bookingId: payment.bookingId, amount: payment.amount, currency: payment.currency, webhookEventType: eventType },
          }).catch(err => this.logger.warn({ err }, 'Failed to publish payment.completed from webhook'))
        }
        break

      case 'payment.failed':
        if (payment.isPending || payment.paymentStatus === 'PROCESSING') {
          await this.paymentRepo.updateStatus(paymentId, 'FAILED', { failureReason: failureReason ?? 'Payment failed via webhook' })
          await this.paymentRepo.addAuditEntry(paymentId, 'FAILED', `Payment failed via webhook: ${failureReason ?? 'unknown'}`, 'system', { webhookEventType: eventType, failureReason })
          await this.cache.invalidatePayment(paymentId)
          this.eventPublisher.publish('payment.events', {
            eventType: 'payment.failed',
            aggregateId: paymentId,
            aggregateType: 'Payment',
            organizationId,
            correlationId,
            payload: { paymentId, bookingId: payment.bookingId, failureReason, webhookEventType: eventType },
          }).catch(err => this.logger.warn({ err }, 'Failed to publish payment.failed from webhook'))
        }
        break

      case 'payment.cancelled':
        if (payment.isPending) {
          await this.paymentRepo.updateStatus(paymentId, 'FAILED', { failureReason: 'Cancelled via webhook' })
          await this.paymentRepo.addAuditEntry(paymentId, 'VOIDED', 'Payment cancelled via webhook', 'system', { webhookEventType: eventType })
          await this.cache.invalidatePayment(paymentId)
        }
        break

      default:
        this.logger.warn({ eventType, paymentId, correlationId }, 'Unhandled webhook event type — audit only')
        await this.paymentRepo.addAuditEntry(paymentId, 'RECONCILED', `Unhandled webhook event: ${eventType}`, 'system', { webhookEventType: eventType })
        break
    }

    this.logger.info({ paymentId, eventType, correlationId }, 'Webhook processed successfully')
  }
}
