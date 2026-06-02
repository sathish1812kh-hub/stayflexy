import { createHmac } from 'crypto'
import { WebhookController } from '../../interfaces/http/WebhookController'
import { Payment } from '../../domain/entities/Payment'
import type { IPaymentRepository } from '../../domain/repositories/IPaymentRepository'
import type { PaymentIdempotencyStore } from '../../infrastructure/idempotency/PaymentIdempotencyStore'
import type { PaymentCache } from '../../infrastructure/cache/PaymentCache'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

const WEBHOOK_SECRET = 'test-webhook-secret'

function makeRawBody(payload: Record<string, unknown>): Buffer {
  return Buffer.from(JSON.stringify(payload))
}

function makeSignature(body: Buffer): string {
  return 'sha256=' + createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex')
}

function makePendingPayment(): Payment {
  return new Payment({
    id: 'pay-1', organizationId: 'org-1', hotelId: 'hotel-1', bookingId: 'booking-1',
    paymentReference: 'PAY-TEST-01', paymentMethod: 'CREDIT_CARD',
    paymentProvider: null, transactionId: null, paymentStatus: 'PENDING',
    amount: 500, currency: 'USD', paidAt: null, refundedAt: null, failureReason: null,
    metadata: null, processedById: 'user-1', createdAt: new Date(), updatedAt: new Date(),
  })
}

const mockPaymentRepo: jest.Mocked<IPaymentRepository> = {
  findById: jest.fn(),
  findByReference: jest.fn(),
  findByOrganization: jest.fn(),
  getTotalRefunded: jest.fn(),
  getRefunds: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn().mockResolvedValue(makePendingPayment()),
  createRefund: jest.fn(),
  updateRefundStatus: jest.fn(),
  addAuditEntry: jest.fn().mockResolvedValue(undefined),
  aggregateByPeriod: jest.fn(),
}

const mockIdempotencyStore: jest.Mocked<PaymentIdempotencyStore> = {
  get: jest.fn().mockResolvedValue(null),
  markProcessing: jest.fn().mockResolvedValue(true),
  store: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
} as unknown as jest.Mocked<PaymentIdempotencyStore>

const mockCache = {
  invalidatePayment: jest.fn().mockResolvedValue(undefined),
} as unknown as jest.Mocked<PaymentCache>

const mockPublisher: IEventPublisher = {
  publish: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn(), disconnect: jest.fn(), isConnected: () => false,
}

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as unknown as Logger

function makeReq(rawBody: Buffer, signature?: string, extraHeaders: Record<string, string> = {}) {
  return {
    body: rawBody,
    headers: {
      'x-webhook-signature': signature ?? makeSignature(rawBody),
      'x-correlation-id': 'corr-test',
      ...extraHeaders,
    },
    params: {},
  }
}

function makeRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    statusCode: 200,
  }
  return res
}

describe('WebhookController', () => {
  let controller: WebhookController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new WebhookController(
      mockPaymentRepo, mockIdempotencyStore, mockCache, mockPublisher, mockLogger, WEBHOOK_SECRET
    )
    mockPaymentRepo.findByReference.mockResolvedValue(makePendingPayment())
  })

  it('returns 401 for missing signature', async () => {
    const rawBody = makeRawBody({ eventId: 'evt-1', eventType: 'payment.captured', paymentReference: 'PAY-TEST-01' })
    const req = makeReq(rawBody, undefined, { 'x-webhook-signature': '' })
    const res = makeRes()
    const next = jest.fn()
    await controller.handleWebhook(req as never, res as never, next)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 401 for invalid signature', async () => {
    const rawBody = makeRawBody({ eventId: 'evt-1', eventType: 'payment.captured', paymentReference: 'PAY-TEST-01' })
    const req = makeReq(rawBody, 'sha256=invalidsignature')
    const res = makeRes()
    await controller.handleWebhook(req as never, res as never, jest.fn())
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 200 and processes payment.captured', async () => {
    const payload = { eventId: 'evt-2', eventType: 'payment.captured', paymentReference: 'PAY-TEST-01' }
    const rawBody = makeRawBody(payload)
    const req = makeReq(rawBody, makeSignature(rawBody))
    const res = makeRes()
    await controller.handleWebhook(req as never, res as never, jest.fn())
    expect(res.status).toHaveBeenCalledWith(200)
    expect(mockPaymentRepo.updateStatus).toHaveBeenCalledWith('pay-1', 'SUCCESS', expect.any(Object))
  })

  it('returns 200 and processes payment.failed', async () => {
    const payload = { eventId: 'evt-3', eventType: 'payment.failed', paymentReference: 'PAY-TEST-01', failureReason: 'Insufficient funds' }
    const rawBody = makeRawBody(payload)
    await controller.handleWebhook(makeReq(rawBody, makeSignature(rawBody)) as never, makeRes() as never, jest.fn())
    expect(mockPaymentRepo.updateStatus).toHaveBeenCalledWith('pay-1', 'FAILED', expect.objectContaining({ failureReason: 'Insufficient funds' }))
  })

  it('returns 409 when request is already being processed (PROCESSING)', async () => {
    mockIdempotencyStore.get.mockResolvedValue('PROCESSING')
    const rawBody = makeRawBody({ eventId: 'evt-4', eventType: 'payment.captured', paymentReference: 'PAY-TEST-01' })
    const req = makeReq(rawBody)
    const res = makeRes()
    await controller.handleWebhook(req as never, res as never, jest.fn())
    expect(res.status).toHaveBeenCalledWith(409)
  })

  it('returns cached response for duplicate webhook (replay prevention)', async () => {
    mockIdempotencyStore.get.mockResolvedValue({
      statusCode: 200,
      body: { success: true, data: { acknowledged: true, eventId: 'evt-5' } },
      createdAt: new Date().toISOString(),
    })
    const rawBody = makeRawBody({ eventId: 'evt-5', eventType: 'payment.captured', paymentReference: 'PAY-TEST-01' })
    const req = makeReq(rawBody)
    const res = makeRes()
    await controller.handleWebhook(req as never, res as never, jest.fn())
    // Should return cached response — no second processing
    expect(mockPaymentRepo.updateStatus).not.toHaveBeenCalled()
  })

  it('stores idempotency result after successful processing', async () => {
    const rawBody = makeRawBody({ eventId: 'evt-6', eventType: 'payment.captured', paymentReference: 'PAY-TEST-01' })
    await controller.handleWebhook(makeReq(rawBody) as never, makeRes() as never, jest.fn())
    expect(mockIdempotencyStore.store).toHaveBeenCalledWith(
      'webhook:evt-6',
      expect.objectContaining({ statusCode: 200 })
    )
  })

  it('returns 400 for invalid JSON body', async () => {
    const rawBody = Buffer.from('not-valid-json')
    const signature = makeSignature(rawBody)
    const req = makeReq(rawBody, signature)
    const res = makeRes()
    await controller.handleWebhook(req as never, res as never, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 for missing eventId', async () => {
    const payload = { eventType: 'payment.captured', paymentReference: 'PAY-TEST-01' }
    const rawBody = makeRawBody(payload)
    const req = makeReq(rawBody)
    const res = makeRes()
    await controller.handleWebhook(req as never, res as never, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
  })
})
