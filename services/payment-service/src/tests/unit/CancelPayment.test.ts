import { CancelPayment } from '../../application/use-cases/CancelPayment'
import { Payment } from '../../domain/entities/Payment'
import { BadRequestError, ForbiddenError, NotFoundError } from '@stayflexi/shared-errors'
import type { IPaymentRepository } from '../../domain/repositories/IPaymentRepository'
import type { PaymentCache } from '../../infrastructure/cache/PaymentCache'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

function makePayment(status: string, orgId = 'org-1'): Payment {
  return new Payment({
    id: 'pay-1', organizationId: orgId, hotelId: 'hotel-1', bookingId: 'booking-1',
    paymentReference: 'PAY-ABC-123', paymentMethod: 'CREDIT_CARD',
    paymentProvider: null, transactionId: null,
    paymentStatus: status as Payment['paymentStatus'],
    amount: 500, currency: 'USD', paidAt: null, refundedAt: null,
    failureReason: null, metadata: null, processedById: 'user-1',
    createdAt: new Date(), updatedAt: new Date(),
  })
}

const mockPaymentRepo: jest.Mocked<IPaymentRepository> = {
  findById: jest.fn(),
  findByReference: jest.fn(),
  findByOrganization: jest.fn(),
  getTotalRefunded: jest.fn(),
  getRefunds: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
  createRefund: jest.fn(),
  updateRefundStatus: jest.fn(),
  addAuditEntry: jest.fn().mockResolvedValue(undefined),
  aggregateByPeriod: jest.fn(),
}

const mockCache = {
  getPayment: jest.fn(),
  setPayment: jest.fn(),
  invalidatePayment: jest.fn().mockResolvedValue(undefined),
  getInvoice: jest.fn(),
  setInvoice: jest.fn(),
  invalidateInvoice: jest.fn(),
} as unknown as jest.Mocked<PaymentCache>

const mockPublisher: IEventPublisher = {
  publish: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn(),
  disconnect: jest.fn(),
  isConnected: () => false,
}

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as unknown as Logger

describe('CancelPayment', () => {
  let useCase: CancelPayment

  beforeEach(() => {
    jest.clearAllMocks()
    mockPaymentRepo.updateStatus.mockResolvedValue(makePayment('CANCELLED'))
    useCase = new CancelPayment(mockPaymentRepo, mockCache, mockPublisher, mockLogger)
  })

  it('cancels a PENDING payment successfully', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('PENDING'))
    const result = await useCase.execute('pay-1', 'Guest request', 'org-1', 'user-1', 'corr-1')
    expect(result.paymentStatus).toBe('CANCELLED')
    expect(mockPaymentRepo.updateStatus).toHaveBeenCalledWith('pay-1', 'CANCELLED', expect.objectContaining({ failureReason: 'Guest request' }))
  })

  it('cancels an AUTHORIZED payment successfully', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('AUTHORIZED'))
    const result = await useCase.execute('pay-1', 'Hold expired', 'org-1', 'user-1')
    expect(result.paymentStatus).toBe('CANCELLED')
    expect(mockPaymentRepo.updateStatus).toHaveBeenCalledWith('pay-1', 'CANCELLED', expect.any(Object))
  })

  it('throws NotFoundError for non-existent payment', async () => {
    mockPaymentRepo.findById.mockResolvedValue(null)
    await expect(useCase.execute('non-existent', undefined, 'org-1', 'user-1')).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError for wrong organization', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('PENDING', 'org-1'))
    await expect(useCase.execute('pay-1', undefined, 'org-OTHER', 'user-1')).rejects.toThrow(ForbiddenError)
  })

  it('throws BadRequestError for SUCCESS payment', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('SUCCESS'))
    await expect(useCase.execute('pay-1', undefined, 'org-1', 'user-1')).rejects.toThrow(BadRequestError)
  })

  it('throws BadRequestError for REFUNDED payment', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('REFUNDED'))
    await expect(useCase.execute('pay-1', undefined, 'org-1', 'user-1')).rejects.toThrow(BadRequestError)
  })

  it('throws BadRequestError for FAILED payment', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('FAILED'))
    await expect(useCase.execute('pay-1', undefined, 'org-1', 'user-1')).rejects.toThrow(BadRequestError)
  })

  it('adds audit entry with VOIDED event type', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('PENDING'))
    await useCase.execute('pay-1', 'Fraud prevention', 'org-1', 'user-1')
    expect(mockPaymentRepo.addAuditEntry).toHaveBeenCalledWith(
      'pay-1', 'VOIDED',
      expect.stringContaining('Fraud prevention'),
      'user-1',
      expect.objectContaining({ reason: 'Fraud prevention' })
    )
  })

  it('invalidates cache after cancellation', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('PENDING'))
    await useCase.execute('pay-1', undefined, 'org-1', 'user-1')
    expect(mockCache.invalidatePayment).toHaveBeenCalledWith('pay-1')
  })

  it('publishes payment.cancelled event', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('PENDING'))
    await useCase.execute('pay-1', 'Test cancellation', 'org-1', 'user-1', 'corr-1')
    // Give fire-and-forget a tick to resolve
    await new Promise(resolve => setImmediate(resolve))
    expect(mockPublisher.publish).toHaveBeenCalledWith(
      'payment.events',
      expect.objectContaining({
        eventType: 'payment.cancelled',
        aggregateId: 'pay-1',
        payload: expect.objectContaining({ paymentId: 'pay-1', reason: 'Test cancellation' }),
      })
    )
  })

  it('uses default reason when none provided', async () => {
    mockPaymentRepo.findById.mockResolvedValue(makePayment('PENDING'))
    await useCase.execute('pay-1', undefined, 'org-1', 'user-1')
    expect(mockPaymentRepo.updateStatus).toHaveBeenCalledWith(
      'pay-1', 'CANCELLED',
      expect.objectContaining({ failureReason: 'Cancelled by user' })
    )
  })
})
