import { ReconciliationService } from '../../reconciliation/ReconciliationService'
import type { IPaymentRepository } from '../../domain/repositories/IPaymentRepository'
import type { PrismaClient } from '@prisma/client'
import type { Logger } from '@stayflexi/shared-logger'

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as unknown as Logger

function makeDecimal(value: number) {
  return { toNumber: () => value }
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
  addAuditEntry: jest.fn(),
  aggregateByPeriod: jest.fn(),
}

const mockBookingAggregate = jest.fn()
const mockBookingCount = jest.fn()

const mockDb = {
  booking: {
    aggregate: mockBookingAggregate,
    count: mockBookingCount,
  },
} as unknown as PrismaClient

describe('ReconciliationService', () => {
  let service: ReconciliationService

  const ORG = 'org-1'
  const HOTEL = 'hotel-1'
  const START = new Date('2025-01-01')
  const END = new Date('2025-01-31')

  beforeEach(() => {
    jest.clearAllMocks()
    service = new ReconciliationService(mockPaymentRepo, mockDb, mockLogger)
  })

  it('generateReport returns correct structure', async () => {
    mockPaymentRepo.aggregateByPeriod.mockResolvedValue({
      totalCollected: 1000, totalRefunded: 100, netRevenue: 900,
      byMethod: [{ method: 'CREDIT_CARD', count: 5, amount: 1000 }],
      transactionCount: 5,
    })
    mockBookingAggregate.mockResolvedValue({ _sum: { finalAmount: makeDecimal(1000) } })
    mockBookingCount.mockResolvedValueOnce(5).mockResolvedValueOnce(1)

    const report = await service.generateReport(ORG, START, END, HOTEL, 'USD')

    expect(report).toMatchObject({
      organizationId: ORG,
      hotelId: HOTEL,
      currency: 'USD',
    })
    expect(report.period.startDate).toBe(START.toISOString())
    expect(report.period.endDate).toBe(END.toISOString())
    expect(typeof report.generatedAt).toBe('string')
    expect(report.payments).toBeDefined()
    expect(report.bookings).toBeDefined()
    expect(report.discrepancy).toBeDefined()
  })

  it('calculates totalCollected, totalRefunded, and netRevenue correctly', async () => {
    mockPaymentRepo.aggregateByPeriod.mockResolvedValue({
      totalCollected: 5000, totalRefunded: 500, netRevenue: 4500,
      byMethod: [], transactionCount: 10,
    })
    mockBookingAggregate.mockResolvedValue({ _sum: { finalAmount: makeDecimal(5000) } })
    mockBookingCount.mockResolvedValue(10)

    const report = await service.generateReport(ORG, START, END, undefined, 'USD')

    expect(report.payments.totalCollected).toBe(5000)
    expect(report.payments.totalRefunded).toBe(500)
    expect(report.payments.netRevenue).toBe(4500)
    expect(report.payments.transactionCount).toBe(10)
  })

  it('detects discrepancy when payments do not match booking values', async () => {
    // Collected 800, but bookings total 1000 — 200 gap
    mockPaymentRepo.aggregateByPeriod.mockResolvedValue({
      totalCollected: 800, totalRefunded: 0, netRevenue: 800,
      byMethod: [], transactionCount: 4,
    })
    mockBookingAggregate.mockResolvedValue({ _sum: { finalAmount: makeDecimal(1000) } })
    mockBookingCount.mockResolvedValue(5)

    const report = await service.generateReport(ORG, START, END, undefined, 'USD')

    expect(report.discrepancy.hasDiscrepancy).toBe(true)
    expect(report.discrepancy.variance).toBe(200) // 1000 - 800
    expect(report.discrepancy.variancePercent).toBe(20) // 200/1000 * 100
    expect(report.discrepancy.explanation).toContain('200.00')
  })

  it('reports no discrepancy when payment values match booking values', async () => {
    mockPaymentRepo.aggregateByPeriod.mockResolvedValue({
      totalCollected: 1000, totalRefunded: 0, netRevenue: 1000,
      byMethod: [], transactionCount: 5,
    })
    mockBookingAggregate.mockResolvedValue({ _sum: { finalAmount: makeDecimal(1000) } })
    mockBookingCount.mockResolvedValue(5)

    const report = await service.generateReport(ORG, START, END, undefined, 'USD')

    expect(report.discrepancy.hasDiscrepancy).toBe(false)
    expect(report.discrepancy.variance).toBe(0)
    expect(report.discrepancy.explanation).toContain('match')
  })

  it('handles empty period with zero amounts', async () => {
    mockPaymentRepo.aggregateByPeriod.mockResolvedValue({
      totalCollected: 0, totalRefunded: 0, netRevenue: 0,
      byMethod: [], transactionCount: 0,
    })
    mockBookingAggregate.mockResolvedValue({ _sum: { finalAmount: null } })
    mockBookingCount.mockResolvedValue(0)

    const report = await service.generateReport(ORG, START, END, undefined, 'USD')

    expect(report.payments.totalCollected).toBe(0)
    expect(report.payments.totalRefunded).toBe(0)
    expect(report.payments.netRevenue).toBe(0)
    expect(report.bookings.totalBookingValue).toBe(0)
    expect(report.discrepancy.hasDiscrepancy).toBe(false)
    expect(report.discrepancy.variance).toBe(0)
    expect(report.discrepancy.variancePercent).toBe(0)
  })

  it('detects overpayment when collected exceeds bookings', async () => {
    // Collected 1200, bookings only 1000
    mockPaymentRepo.aggregateByPeriod.mockResolvedValue({
      totalCollected: 1200, totalRefunded: 0, netRevenue: 1200,
      byMethod: [], transactionCount: 6,
    })
    mockBookingAggregate.mockResolvedValue({ _sum: { finalAmount: makeDecimal(1000) } })
    mockBookingCount.mockResolvedValue(5)

    const report = await service.generateReport(ORG, START, END, undefined, 'USD')

    expect(report.discrepancy.hasDiscrepancy).toBe(true)
    expect(report.discrepancy.variance).toBe(-200) // 1000 - 1200
    expect(report.discrepancy.explanation).toContain('200.00')
    expect(report.discrepancy.explanation).toContain('exceeds')
  })

  it('includes confirmed and cancelled booking counts', async () => {
    mockPaymentRepo.aggregateByPeriod.mockResolvedValue({
      totalCollected: 500, totalRefunded: 0, netRevenue: 500,
      byMethod: [], transactionCount: 3,
    })
    mockBookingAggregate.mockResolvedValue({ _sum: { finalAmount: makeDecimal(500) } })
    // confirmed: 3, cancelled: 2
    mockBookingCount.mockResolvedValueOnce(3).mockResolvedValueOnce(2)

    const report = await service.generateReport(ORG, START, END, undefined, 'USD')

    expect(report.bookings.confirmedBookingsCount).toBe(3)
    expect(report.bookings.cancelledBookingsCount).toBe(2)
  })
})
