import { LedgerService } from '../../ledger/LedgerService'
import type { Logger } from '@stayflexi/shared-logger'
import type { PrismaClient } from '@prisma/client'

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as unknown as Logger

const mockPaymentAuditCreate = jest.fn().mockResolvedValue({ id: 'audit-1', createdAt: new Date() })
const mockPaymentAuditFindMany = jest.fn().mockResolvedValue([])
const mockPaymentAggregate = jest.fn().mockResolvedValue({
  _sum: { amount: { toNumber: () => 1000 } },
  _count: { id: 5 },
})
const mockRefundAggregate = jest.fn().mockResolvedValue({
  _sum: { refundAmount: { toNumber: () => 100 } },
})
const mockPaymentCount = jest.fn().mockResolvedValue(10)

const mockDb = {
  paymentAudit: { create: mockPaymentAuditCreate, findMany: mockPaymentAuditFindMany },
  payment: { aggregate: mockPaymentAggregate, count: mockPaymentCount },
  refund: { aggregate: mockRefundAggregate },
} as unknown as PrismaClient

describe('LedgerService', () => {
  let ledger: LedgerService

  beforeEach(() => {
    jest.clearAllMocks()
    ledger = new LedgerService(mockDb, mockLogger)
  })

  describe('recordPayment', () => {
    it('creates an audit entry with CREDIT ledger metadata', async () => {
      await ledger.recordPayment('org-1', 'hotel-1', 'pay-1', 500, 'USD', 'user-1', 'corr-1')
      expect(mockPaymentAuditCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentId: 'pay-1',
            eventType: 'SUCCESS',
            eventDescription: expect.stringContaining('LEDGER:CREDIT'),
          }),
        })
      )
    })

    it('logs the credit entry', async () => {
      await ledger.recordPayment('org-1', 'hotel-1', 'pay-1', 500, 'USD', 'user-1')
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ paymentId: 'pay-1', amount: 500, currency: 'USD' }),
        'Ledger entry recorded: CREDIT'
      )
    })
  })

  describe('recordRefund', () => {
    it('creates an audit entry with DEBIT ledger metadata', async () => {
      await ledger.recordRefund('org-1', 'hotel-1', 'pay-1', 'ref-1', 100, 'USD', 'user-1', 'corr-1')
      expect(mockPaymentAuditCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentId: 'pay-1',
            eventType: 'REFUND_SUCCESS',
            eventDescription: expect.stringContaining('LEDGER:DEBIT'),
          }),
        })
      )
    })

    it('logs the debit entry', async () => {
      await ledger.recordRefund('org-1', 'hotel-1', 'pay-1', 'ref-1', 100, 'USD', 'user-1')
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ paymentId: 'pay-1', refundId: 'ref-1', amount: 100 }),
        'Ledger entry recorded: DEBIT'
      )
    })
  })

  describe('getBalance', () => {
    it('returns correct net balance', async () => {
      const balance = await ledger.getBalance('org-1', 'hotel-1', 'USD')
      expect(balance.totalCredits).toBe(1000)
      expect(balance.totalDebits).toBe(100)
      expect(balance.netBalance).toBe(900)
      expect(balance.currency).toBe('USD')
      expect(balance.organizationId).toBe('org-1')
      expect(balance.hotelId).toBe('hotel-1')
    })

    it('returns zero balance when no data', async () => {
      mockPaymentAggregate.mockResolvedValueOnce({ _sum: { amount: null }, _count: { id: 0 } })
      mockRefundAggregate.mockResolvedValueOnce({ _sum: { refundAmount: null } })
      mockPaymentCount.mockResolvedValueOnce(0)
      const balance = await ledger.getBalance('org-new', 'hotel-new', 'USD')
      expect(balance.netBalance).toBe(0)
      expect(balance.totalCredits).toBe(0)
      expect(balance.totalDebits).toBe(0)
    })

    it('defaults currency to USD when not specified', async () => {
      const balance = await ledger.getBalance('org-1', 'hotel-1')
      expect(balance.currency).toBe('USD')
    })
  })

  describe('getEntries', () => {
    it('returns empty array when no ledger entries exist', async () => {
      const entries = await ledger.getEntries('pay-1')
      expect(entries).toHaveLength(0)
    })

    it('parses ledger entries from audit records containing LEDGER: prefix', async () => {
      const now = new Date()
      mockPaymentAuditFindMany.mockResolvedValueOnce([
        {
          id: 'audit-1', paymentId: 'pay-1', eventType: 'SUCCESS',
          eventDescription: 'LEDGER:CREDIT:500:USD',
          performedById: 'user-1', createdAt: now,
          metadata: {
            id: 'ledger-1', organizationId: 'org-1', hotelId: 'hotel-1',
            referenceId: 'pay-1', referenceType: 'Payment',
            entryType: 'CREDIT', category: 'PAYMENT',
            amount: 500, currency: 'USD',
            description: 'LEDGER:CREDIT:500:USD', balanceAfter: 0,
          },
        },
      ])
      const entries = await ledger.getEntries('pay-1')
      expect(entries).toHaveLength(1)
      const entry = entries[0]
      expect(entry).toBeDefined()
      if (entry) {
        expect(entry.entryType).toBe('CREDIT')
        expect(entry.amount).toBe(500)
        expect(entry.referenceType).toBe('Payment')
      }
    })

    it('filters out audit records without metadata', async () => {
      mockPaymentAuditFindMany.mockResolvedValueOnce([
        {
          id: 'audit-2', paymentId: 'pay-1', eventType: 'SUCCESS',
          eventDescription: 'LEDGER:CREDIT:100:USD',
          performedById: 'user-1', createdAt: new Date(),
          metadata: null,
        },
      ])
      const entries = await ledger.getEntries('pay-1')
      expect(entries).toHaveLength(0)
    })
  })
})
