import { ProcessRefund } from '../../application/use-cases/ProcessRefund'
import { Payment } from '../../domain/entities/Payment'
import { Refund } from '../../domain/entities/Refund'
import { BadRequestError, ForbiddenError, NotFoundError } from '@stayflexi/shared-errors'
import type { IPaymentRepository } from '../../domain/repositories/IPaymentRepository'
import type { PaymentCache } from '../../infrastructure/cache/PaymentCache'
import type { LedgerService } from '../../ledger/LedgerService'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

const makePayment = (status: string, amount = 330): Payment => new Payment({
  id: 'pay-1', organizationId: 'org-1', hotelId: 'hotel-1', bookingId: 'booking-1',
  paymentReference: 'PAY-ABC-123', paymentMethod: 'CREDIT_CARD',
  paymentProvider: null, transactionId: null, paymentStatus: status as Payment['paymentStatus'],
  amount, currency: 'USD', paidAt: null, refundedAt: null, failureReason: null,
  metadata: null, processedById: 'user-1', createdAt: new Date(), updatedAt: new Date(),
})

const makeRefund = (): Refund => new Refund({
  id: 'ref-1', paymentId: 'pay-1', refundReference: 'REF-ABC-123',
  refundAmount: 100, refundReason: 'Guest request', refundStatus: 'SUCCESS',
  processedById: 'user-1', processedAt: new Date(), failureReason: null,
  createdAt: new Date(), updatedAt: new Date(),
})

const mockPaymentRepo: jest.Mocked<IPaymentRepository> = {
  findById: jest.fn(), findByReference: jest.fn(), findByOrganization: jest.fn(),
  getTotalRefunded: jest.fn().mockResolvedValue(0), getRefunds: jest.fn(),
  create: jest.fn(), updateStatus: jest.fn().mockResolvedValue(makePayment('PARTIALLY_REFUNDED')),
  createRefund: jest.fn().mockResolvedValue(makeRefund()),
  updateRefundStatus: jest.fn(), addAuditEntry: jest.fn().mockResolvedValue(undefined),
  aggregateByPeriod: jest.fn(),
}

const mockCache = {
  getPayment: jest.fn(), setPayment: jest.fn(), invalidatePayment: jest.fn().mockResolvedValue(undefined),
  getInvoice: jest.fn(), setInvoice: jest.fn(), invalidateInvoice: jest.fn(),
} as unknown as jest.Mocked<PaymentCache>

const mockLedger = {
  recordPayment: jest.fn(), recordRefund: jest.fn().mockResolvedValue(undefined),
  getBalance: jest.fn(), getEntries: jest.fn(),
} as unknown as jest.Mocked<LedgerService>

const mockPublisher: IEventPublisher = {
  publish: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn(), disconnect: jest.fn(), isConnected: () => false,
}

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as unknown as Logger

describe('ProcessRefund', () => {
  let useCase: ProcessRefund

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new ProcessRefund(mockPaymentRepo, mockCache, mockLedger, mockPublisher, mockLogger)
  })

  it('processes a partial refund successfully', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('SUCCESS'))
    mockPaymentRepo.getTotalRefunded.mockResolvedValue(0)
    const refund = await useCase.execute('pay-1', { refundAmount: 100, refundReason: 'Guest request' }, 'org-1', 'user-1')
    expect(refund.refundAmount).toBe(100)
    expect(mockPaymentRepo.updateStatus).toHaveBeenCalledWith('pay-1', 'PARTIALLY_REFUNDED', expect.any(Object))
  })

  it('processes a full refund and sets REFUNDED status', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('SUCCESS'))
    mockPaymentRepo.getTotalRefunded.mockResolvedValue(0)
    await useCase.execute('pay-1', { refundAmount: 330, refundReason: 'Cancellation' }, 'org-1', 'user-1')
    expect(mockPaymentRepo.updateStatus).toHaveBeenCalledWith('pay-1', 'REFUNDED', expect.any(Object))
  })

  it('throws BadRequestError when refund exceeds payment amount', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('SUCCESS'))
    mockPaymentRepo.getTotalRefunded.mockResolvedValue(0)
    await expect(useCase.execute('pay-1', { refundAmount: 500, refundReason: 'Test' }, 'org-1', 'user-1')).rejects.toThrow(BadRequestError)
  })

  it('throws BadRequestError when refund exceeds remaining refundable amount', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('PARTIALLY_REFUNDED'))
    mockPaymentRepo.getTotalRefunded.mockResolvedValue(230)  // already refunded 230 of 330
    await expect(useCase.execute('pay-1', { refundAmount: 200, refundReason: 'Too much' }, 'org-1', 'user-1')).rejects.toThrow(BadRequestError)
  })

  it('throws BadRequestError for refund on non-refundable payment', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('PENDING'))
    await expect(useCase.execute('pay-1', { refundAmount: 100, refundReason: 'Test' }, 'org-1', 'user-1')).rejects.toThrow(BadRequestError)
  })

  it('throws NotFoundError for non-existent payment', async () => {
    mockPaymentRepo.findById.mockResolvedValue(null)
    await expect(useCase.execute('non-existent', { refundAmount: 100, refundReason: 'Test' }, 'org-1', 'user-1')).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError for wrong organization', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('SUCCESS'))
    await expect(useCase.execute('pay-1', { refundAmount: 100, refundReason: 'Test' }, 'org-OTHER', 'user-1')).rejects.toThrow(ForbiddenError)
  })

  it('records refund in ledger', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('SUCCESS'))
    mockPaymentRepo.getTotalRefunded.mockResolvedValue(0)
    await useCase.execute('pay-1', { refundAmount: 100, refundReason: 'Test' }, 'org-1', 'user-1')
    await new Promise(resolve => setImmediate(resolve))
    expect(mockLedger.recordRefund).toHaveBeenCalled()
  })
})
