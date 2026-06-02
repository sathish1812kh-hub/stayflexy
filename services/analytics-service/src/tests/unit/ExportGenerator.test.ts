import { ExportGenerator } from '../../exports/ExportGenerator'
import type { ReportAggregator } from '../../aggregators/ReportAggregator'
import type { AnalyticsCache } from '../../infrastructure/cache/AnalyticsCache'
import type { Logger } from '@stayflexi/shared-logger'

const mockLogger: Logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger

const mockReportAggregator = {
  generateFinancialReport: jest.fn(),
  generateOccupancyReport: jest.fn(),
  generateOtaReport: jest.fn(),
} as unknown as jest.Mocked<ReportAggregator>

const mockCache: jest.Mocked<AnalyticsCache> = {
  getKpis: jest.fn(),
  setKpis: jest.fn(),
  invalidateKpis: jest.fn(),
  getOccupancy: jest.fn(),
  setOccupancy: jest.fn(),
  getRevenueReport: jest.fn(),
  setRevenueReport: jest.fn(),
  getForecast: jest.fn(),
  setForecast: jest.fn(),
  getDashboard: jest.fn(),
  setDashboard: jest.fn(),
  getExportStatus: jest.fn(),
  setExportStatus: jest.fn(),
  invalidateHotel: jest.fn(),
} as unknown as jest.Mocked<AnalyticsCache>

const validQuery = {
  hotelId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  reportType: 'financial' as const,
  dateFrom: '2024-01-01',
  dateTo: '2024-01-07',
  format: 'json' as const,
}

describe('ExportGenerator', () => {
  let generator: ExportGenerator

  beforeEach(() => {
    jest.clearAllMocks()
    mockCache.setExportStatus.mockResolvedValue(undefined)
    mockCache.getExportStatus.mockResolvedValue(null)
    mockReportAggregator.generateFinancialReport = jest.fn().mockResolvedValue({
      hotelId: validQuery.hotelId,
      revenue: { total: 5000, byMethod: [], collected: 5000, refunded: 0, net: 5000 },
      bookings: { total: 25, confirmed: 10, checkedOut: 10, cancelled: 5, noShow: 0, avgValue: 200 },
      kpis: { adr: 200, revpar: 140, occupancyRate: 70, cancellationRate: 20 },
    })
    generator = new ExportGenerator(mockReportAggregator, mockCache, mockLogger)
  })

  it('initiates export job and returns PENDING status', async () => {
    const job = await generator.initiateExport(validQuery, 'org-1')
    expect(job.status).toBe('PENDING')
    expect(job.exportId).toBeTruthy()
    expect(job.reportType).toBe('financial')
    expect(job.hotelId).toBe(validQuery.hotelId)
    expect(mockCache.setExportStatus).toHaveBeenCalledWith(job.exportId, expect.objectContaining({ status: 'PENDING' }))
  })

  it('export completes and status becomes COMPLETED', async () => {
    let capturedId = ''
    let capturedJob: unknown = null

    mockCache.setExportStatus.mockImplementation(async (id, data) => {
      capturedId = id
      capturedJob = data
    })

    const job = await generator.initiateExport(validQuery, 'org-1')

    // Wait for setImmediate to process the async export
    await new Promise<void>(resolve => setImmediate(resolve))
    // Give async operations time to complete
    await new Promise<void>(resolve => setTimeout(resolve, 50))

    expect(mockReportAggregator.generateFinancialReport).toHaveBeenCalled()
    // The last call to setExportStatus should have COMPLETED status
    const calls = mockCache.setExportStatus.mock.calls
    const completedCall = calls.find(c => {
      const d = c[1] as { status?: string }
      return d?.status === 'COMPLETED'
    })
    expect(completedCall).toBeDefined()
  })

  it('export fails gracefully and status becomes FAILED', async () => {
    mockReportAggregator.generateFinancialReport = jest.fn().mockRejectedValue(new Error('DB connection failed'))

    await generator.initiateExport(validQuery, 'org-1')

    // Wait for setImmediate + async operations
    await new Promise<void>(resolve => setImmediate(resolve))
    await new Promise<void>(resolve => setTimeout(resolve, 50))

    const calls = mockCache.setExportStatus.mock.calls
    const failedCall = calls.find(c => {
      const d = c[1] as { status?: string }
      return d?.status === 'FAILED'
    })
    expect(failedCall).toBeDefined()
    const failedJob = failedCall?.[1] as { error?: string }
    expect(failedJob?.error).toBe('DB connection failed')
  })

  it('getExportStatus returns null for unknown exportId', async () => {
    mockCache.getExportStatus.mockResolvedValue(null)
    const result = await generator.getExportStatus('nonexistent-id')
    expect(result).toBeNull()
  })
})
