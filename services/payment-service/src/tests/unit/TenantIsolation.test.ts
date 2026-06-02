/**
 * Tenant isolation tests — verify every use-case enforces organizationId ownership.
 */
import { ProcessRefund } from '../../application/use-cases/ProcessRefund'
import { ConfirmPayment } from '../../application/use-cases/ConfirmPayment'
import { CancelPayment } from '../../application/use-cases/CancelPayment'
import { Payment } from '../../domain/entities/Payment'
import { ForbiddenError } from '@stayflexi/shared-errors'
import type { IPaymentRepository } from '../../domain/repositories/IPaymentRepository'
import type { PaymentCache } from '../../infrastructure/cache/PaymentCache'
import type { LedgerService } from '../../ledger/LedgerService'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

function makePayment(status: string, orgId = 'org-correct'): Payment {
  return new Payment({
    id: 'pay-1', organizationId: orgId, hotelId: 'hotel-1', bookingId: 'booking-1',
    paymentReference: 'PAY-ABC', paymentMethod: 'CREDIT_CARD',
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
  getTotalRefunded: jest.fn().mockResolvedValue(0),
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

const mockLedger = {
  recordPayment: jest.fn().mockResolvedValue(undefined),
  recordRefund: jest.fn().mockResolvedValue(undefined),
  getBalance: jest.fn(),
  getEntries: jest.fn(),
} as unknown as jest.Mocked<LedgerService>

const mockPublisher: IEventPublisher = {
  publish: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn(),
  disconnect: jest.fn(),
  isConnected: () => false,
}

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as unknown as Logger

describe('Tenant Isolation', () => {
  const CORRECT_ORG = 'org-correct'
  const WRONG_ORG = 'org-attacker'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('ProcessRefund', () => {
    it('throws ForbiddenError when organizationId does not match payment.organizationId', async () => {
      const useCase = new ProcessRefund(mockPaymentRepo, mockCache, mockLedger, mockPublisher, mockLogger)
      mockPaymentRepo.findById.mockResolvedValue(makePayment('SUCCESS', CORRECT_ORG))
      await expect(
        useCase.execute('pay-1', { refundAmount: 100, refundReason: 'Test' }, WRONG_ORG, 'user-attacker')
      ).rejects.toThrow(ForbiddenError)
    })

    it('succeeds when organizationId matches', async () => {
      const useCase = new ProcessRefund(mockPaymentRepo, mockCache, mockLedger, mockPublisher, mockLogger)
      mockPaymentRepo.findById.mockResolvedValue(makePayment('SUCCESS', CORRECT_ORG))
      mockPaymentRepo.createRefund.mockResolvedValue({
        id: 'ref-1', paymentId: 'pay-1', refundReference: 'REF-1',
        refundAmount: 100, refundReason: 'Test', refundStatus: 'SUCCESS',
        processedById: 'user-1', processedAt: new Date(), failureReason: null,
        createdAt: new Date(), updatedAt: new Date(),
        toJSON: jest.fn(),
      } as never)
      mockPaymentRepo.updateStatus.mockResolvedValue(makePayment('PARTIALLY_REFUNDED', CORRECT_ORG))
      await expect(
        useCase.execute('pay-1', { refundAmount: 100, refundReason: 'Test' }, CORRECT_ORG, 'user-1')
      ).resolves.toBeDefined()
    })
  })

  describe('ConfirmPayment', () => {
    it('throws ForbiddenError for wrong org', async () => {
      const useCase = new ConfirmPayment(mockPaymentRepo, mockCache, mockLedger, mockPublisher, mockLogger)
      mockPaymentRepo.findById.mockResolvedValue(makePayment('PENDING', CORRECT_ORG))
      await expect(
        useCase.execute('pay-1', {}, WRONG_ORG, 'user-attacker')
      ).rejects.toThrow(ForbiddenError)
    })

    it('succeeds when organizationId matches', async () => {
      const useCase = new ConfirmPayment(mockPaymentRepo, mockCache, mockLedger, mockPublisher, mockLogger)
      mockPaymentRepo.findById.mockResolvedValue(makePayment('PENDING', CORRECT_ORG))
      mockPaymentRepo.updateStatus.mockResolvedValue(makePayment('SUCCESS', CORRECT_ORG))
      await expect(
        useCase.execute('pay-1', {}, CORRECT_ORG, 'user-1')
      ).resolves.toBeDefined()
    })
  })

  describe('CancelPayment', () => {
    it('throws ForbiddenError for wrong org', async () => {
      const useCase = new CancelPayment(mockPaymentRepo, mockCache, mockPublisher, mockLogger)
      mockPaymentRepo.findById.mockResolvedValue(makePayment('PENDING', CORRECT_ORG))
      await expect(
        useCase.execute('pay-1', undefined, WRONG_ORG, 'user-attacker')
      ).rejects.toThrow(ForbiddenError)
    })

    it('succeeds when organizationId matches', async () => {
      const useCase = new CancelPayment(mockPaymentRepo, mockCache, mockPublisher, mockLogger)
      mockPaymentRepo.findById.mockResolvedValue(makePayment('PENDING', CORRECT_ORG))
      mockPaymentRepo.updateStatus.mockResolvedValue(makePayment('CANCELLED', CORRECT_ORG))
      await expect(
        useCase.execute('pay-1', 'Legitimate cancel', CORRECT_ORG, 'user-1')
      ).resolves.toBeDefined()
    })
  })

  describe('Cross-org data access via payment lookup', () => {
    it('cannot read another orgs payment even by direct ID lookup — payment entity enforces org check', () => {
      const payment = makePayment('SUCCESS', CORRECT_ORG)
      // Direct belongsToOrganization check
      expect(payment.belongsToOrganization(WRONG_ORG)).toBe(false)
      expect(payment.belongsToOrganization(CORRECT_ORG)).toBe(true)
    })
  })
})
