import { ConfirmPayment } from '../../application/use-cases/ConfirmPayment'
import { Payment } from '../../domain/entities/Payment'
import { BadRequestError, ForbiddenError, NotFoundError } from '@stayflexi/shared-errors'
import type { IPaymentRepository } from '../../domain/repositories/IPaymentRepository'
import type { PaymentCache } from '../../infrastructure/cache/PaymentCache'
import type { LedgerService } from '../../ledger/LedgerService'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

const makePayment = (status: string): Payment => new Payment({
  id: 'pay-1', organizationId: 'org-1', hotelId: 'hotel-1', bookingId: 'booking-1',
  paymentReference: 'PAY-ABC-123', paymentMethod: 'CREDIT_CARD',
  paymentProvider: null, transactionId: null, paymentStatus: status as Payment['paymentStatus'],
  amount: 330, currency: 'USD', paidAt: null, refundedAt: null, failureReason: null,
  metadata: null, processedById: 'user-1', createdAt: new Date(), updatedAt: new Date(),
})

const makeConfirmedPayment = (): Payment => new Payment({
  id: 'pay-1', organizationId: 'org-1', hotelId: 'hotel-1', bookingId: 'booking-1',
  paymentReference: 'PAY-ABC-123', paymentMethod: 'CREDIT_CARD',
  paymentProvider: null, transactionId: 'txn-001', paymentStatus: 'SUCCESS',
  amount: 330, currency: 'USD', paidAt: new Date(), refundedAt: null, failureReason: null,
  metadata: null, processedById: 'user-1', createdAt: new Date(), updatedAt: new Date(),
})

const mockPaymentRepo: jest.Mocked<IPaymentRepository> = {
  findById: jest.fn(),
  findByReference: jest.fn(),
  findByOrganization: jest.fn(),
  getTotalRefunded: jest.fn(),
  getRefunds: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn().mockResolvedValue(makeConfirmedPayment()),
  createRefund: jest.fn(),
  updateRefundStatus: jest.fn(),
  addAuditEntry: jest.fn().mockResolvedValue(undefined),
  aggregateByPeriod: jest.fn(),
}

const mockCache = {
  getPayment: jest.fn(), setPayment: jest.fn(),
  invalidatePayment: jest.fn().mockResolvedValue(undefined),
  getInvoice: jest.fn(), setInvoice: jest.fn(), invalidateInvoice: jest.fn(),
} as unknown as jest.Mocked<PaymentCache>

const mockLedger = {
  recordPayment: jest.fn().mockResolvedValue(undefined),
  recordRefund: jest.fn(),
  getBalance: jest.fn(),
  getEntries: jest.fn(),
} as unknown as jest.Mocked<LedgerService>

const mockPublisher: IEventPublisher = {
  publish: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn(), disconnect: jest.fn(), isConnected: () => false,
}

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as unknown as Logger

describe('ConfirmPayment', () => {
  let useCase: ConfirmPayment

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new ConfirmPayment(mockPaymentRepo, mockCache, mockLedger, mockPublisher, mockLogger)
  })

  it('confirms a PENDING payment successfully', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('PENDING'))
    const result = await useCase.execute('pay-1', { transactionId: 'txn-001' }, 'org-1', 'user-1', 'corr-1')
    expect(result.paymentStatus).toBe('SUCCESS')
    expect(mockPaymentRepo.updateStatus).toHaveBeenCalledWith('pay-1', 'SUCCESS', expect.objectContaining({ paidAt: expect.any(Date) }))
  })

  it('confirms a PROCESSING payment successfully', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('PROCESSING'))
    await useCase.execute('pay-1', {}, 'org-1', 'user-1')
    expect(mockPaymentRepo.updateStatus).toHaveBeenCalledWith('pay-1', 'SUCCESS', expect.any(Object))
  })

  it('throws NotFoundError for non-existent payment', async () => {
    mockPaymentRepo.findById.mockResolvedValue(null)
    await expect(useCase.execute('no-such', {}, 'org-1', 'user-1')).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError for wrong organization', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('PENDING'))
    await expect(useCase.execute('pay-1', {}, 'org-OTHER', 'user-1')).rejects.toThrow(ForbiddenError)
  })

  it('throws BadRequestError when payment is already SUCCESS', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('SUCCESS'))
    await expect(useCase.execute('pay-1', {}, 'org-1', 'user-1')).rejects.toThrow(BadRequestError)
  })

  it('throws BadRequestError when payment is FAILED', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('FAILED'))
    await expect(useCase.execute('pay-1', {}, 'org-1', 'user-1')).rejects.toThrow(BadRequestError)
  })

  it('throws BadRequestError when payment is REFUNDED', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('REFUNDED'))
    await expect(useCase.execute('pay-1', {}, 'org-1', 'user-1')).rejects.toThrow(BadRequestError)
  })

  it('records payment in ledger', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('PENDING'))
    await useCase.execute('pay-1', {}, 'org-1', 'user-1', 'corr-1')
    await new Promise(resolve => setImmediate(resolve))
    expect(mockLedger.recordPayment).toHaveBeenCalledWith(
      'org-1', 'hotel-1', 'pay-1', 330, 'USD', 'user-1', 'corr-1'
    )
  })

  it('adds audit entry on success', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('PENDING'))
    await useCase.execute('pay-1', {}, 'org-1', 'user-1')
    expect(mockPaymentRepo.addAuditEntry).toHaveBeenCalledWith('pay-1', 'SUCCESS', expect.any(String), 'user-1', expect.any(Object))
  })

  it('invalidates cache on success', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('PENDING'))
    await useCase.execute('pay-1', {}, 'org-1', 'user-1')
    expect(mockCache.invalidatePayment).toHaveBeenCalledWith('pay-1')
  })

  it('publishes payment.completed event', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('PENDING'))
    await useCase.execute('pay-1', {}, 'org-1', 'user-1', 'corr-1')
    await new Promise(resolve => setImmediate(resolve))
    expect(mockPublisher.publish).toHaveBeenCalledWith('payment.events', expect.objectContaining({ eventType: 'payment.completed' }))
  })

  it('does not fail if ledger recording throws', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('PENDING'))
    mockLedger.recordPayment.mockRejectedValue(new Error('Ledger unavailable'))
    await expect(useCase.execute('pay-1', {}, 'org-1', 'user-1')).resolves.toBeDefined()
  })
})
