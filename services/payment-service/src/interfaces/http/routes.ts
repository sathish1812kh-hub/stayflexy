import { Router } from 'express'
import express from 'express'
import type { PaymentController } from './PaymentController'
import type { WebhookController } from './WebhookController'

export function createPaymentRouter(controller: PaymentController, webhook: WebhookController): Router {
  const router = Router()

  // Payment lifecycle
  router.post('/api/v1/payments/initiate', controller.initiatePayment)
  router.post('/api/v1/payments/:id/confirm', controller.confirmPayment)
  router.post('/api/v1/payments/:id/refund', controller.processRefund)
  router.post('/api/v1/payments/:id/cancel', controller.cancelPayment)
  router.get('/api/v1/payments/:id', controller.getPayment)
  router.get('/api/v1/payments', controller.listPayments)

  // Webhooks — raw body required for HMAC signature verification
  router.post(
    '/api/v1/payments/webhooks',
    express.raw({ type: ['application/json', 'application/octet-stream'], limit: '512kb' }),
    webhook.handleWebhook
  )

  // Invoices
  router.post('/api/v1/invoices', controller.generateInvoice)
  router.get('/api/v1/invoices/:id', controller.getInvoice)

  // Reconciliation
  router.get('/api/v1/reconciliation', controller.getReconciliation)

  return router
}
