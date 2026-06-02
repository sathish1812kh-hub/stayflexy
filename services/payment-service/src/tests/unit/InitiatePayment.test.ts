import { InitiatePayment } from '../../application/use-cases/InitiatePayment'
import { Payment } from '../../domain/entities/Payment'
import { BadRequestError } from '@stayflexi/shared-errors'
import type { IPaymentRepository } from '../../domain/repositories/IPaymentRepository'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

const makePayment = (): Payment => new Payment({
  id: 'pay-1', organizationId: 'org-1', hotelId: 'hotel-1', bookingId: 'booking-1',
  paymentReference: 'PAY-ABC-123', paymentMethod: 'CREDIT_CARD',
  paymentProvider: null, transactionId: null, paymentStatus: 'PENDING',
  amount: 330, currency: 'USD', paidAt: null, refundedAt: null, failureReason: null,
  metadata: null, processedById: 'user-1', createdAt: new Date(), updatedAt: new Date(),
})

const mockPaymentRepo: jest.Mocked<IPaymentRepository> = {
  findById: jest.fn(), findByReference: jest.fn(), findByOrganization: jest.fn(),
  getTotalRefunded: jest.fn(), getRefunds: jest.fn(),
  create: jest.fn().mockResolvedValue(makePayment()),
  updateStatus: jest.fn(), createRefund: jest.fn(), updateRefundStatus: jest.fn(),
  addAuditEntry: jest.fn().mockResolvedValue(undefined),
  aggregateByPeriod: jest.fn(),
}

const mockPublisher: IEventPublisher = {
  publish: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn(), disconnect: jest.fn(), isConnected: () => false,
}

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as unknown as Logger

const validDto = {
  bookingId: '00000000-0000-0000-0000-000000000001',
  hotelId: '00000000-0000-0000-0000-000000000002',
  paymentMethod: 'CREDIT_CARD' as const,
  amount: 330,
  currency: 'USD',
}

describe('InitiatePayment', () => {
  let useCase: InitiatePayment

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new InitiatePayment(mockPaymentRepo, mockPublisher, mockLogger)
  })

  it('creates a payment successfully', async () => {
    const result = await useCase.execute(validDto, 'org-1', 'user-1', 'corr-1')
    expect(result.paymentStatus).toBe('PENDING')
    expect(result.amount).toBe(330)
    expect(mockPaymentRepo.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 330, currency: 'USD', bookingId: validDto.bookingId }))
  })

  it('throws BadRequestError for zero amount', async () => {
    await expect(useCase.execute({ ...validDto, amount: 0 }, 'org-1', 'user-1')).rejects.toThrow(BadRequestError)
  })

  it('throws BadRequestError for negative amount', async () => {
    await expect(useCase.execute({ ...validDto, amount: -100 }, 'org-1', 'user-1')).rejects.toThrow(BadRequestError)
  })

  it('publishes payment.initiated event', async () => {
    await useCase.execute(validDto, 'org-1', 'user-1', 'corr-1')
    await new Promise(resolve => setImmediate(resolve))
    expect(mockPublisher.publish).toHaveBeenCalledWith('payment.events', expect.objectContaining({ eventType: 'payment.initiated' }))
  })
})
