import { AggregationWorker } from '../../workers/AggregationWorker'
import type { KpiCalculator } from '../../aggregators/KpiCalculator'
import type { IRevenueMetricRepository } from '../../domain/repositories/IRevenueMetricRepository'
import type { AnalyticsCache } from '../../infrastructure/cache/AnalyticsCache'
import type { PrismaClient } from '@prisma/client'
import type { Logger } from '@stayflexi/shared-logger'

const mockLogger: Logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as unknown as Logger

const mockKpis = {
  hotelId: 'hotel-1', organizationId: 'org-1',
  period: { from: '2024-01-01', to: '2024-01-01' },
  occupancyRate: 72, adr: 180, revpar: 129.6, totalRevenue: 1800,
  totalBookings: 10, cancellationRate: 5, averageStayDuration: 2,
  revenueByChannel: {}, revenueByRoomType: {},
}

const mockKpiCalculator = {
  calculateKpis: jest.fn().mockResolvedValue(mockKpis),
  calculateOccupancy: jest.fn(),
} as unknown as jest.Mocked<KpiCalculator>

const mockRevenueMetricRepo: jest.Mocked<IRevenueMetricRepository> = {
  findByHotelAndRange: jest.fn(),
  findByHotelAndDate: jest.fn(),
  upsert: jest.fn().mockResolvedValue({}),
  findByOrganization: jest.fn(),
}

const mockCache = {
  invalidateKpis: jest.fn().mockResolvedValue(undefined),
  getDashboard: jest.fn(), setDashboard: jest.fn(),
  getKpis: jest.fn(), setKpis: jest.fn(),
  getOccupancy: jest.fn(), setOccupancy: jest.fn(),
  getRevenueReport: jest.fn(), setRevenueReport: jest.fn(),
  getForecast: jest.fn(), setForecast: jest.fn(),
  getExportStatus: jest.fn(), setExportStatus: jest.fn(),
  invalidateHotel: jest.fn(),
} as unknown as jest.Mocked<AnalyticsCache>

const mockDb = {
  booking: {
    groupBy: jest.fn().mockResolvedValue([
      { hotelId: 'hotel-1', organizationId: 'org-1', _count: { id: 10 } },
    ]),
  },
} as unknown as PrismaClient

describe('AggregationWorker', () => {
  let worker: AggregationWorker

  beforeEach(() => {
    jest.clearAllMocks()
    worker = new AggregationWorker(mockDb, mockRevenueMetricRepo, mockKpiCalculator, mockCache, mockLogger, 100000)
  })

  afterEach(() => {
    worker.stop()
  })

  it('starts without error', () => {
    expect(() => worker.start()).not.toThrow()
  })

  it('does not start twice', () => {
    worker.start()
    worker.start() // second call should be no-op
    // Should only log once
    expect(mockLogger.info).toHaveBeenCalledTimes(1)
  })

  it('stops without error', () => {
    worker.start()
    expect(() => worker.stop()).not.toThrow()
  })

  it('runs aggregation for active hotels on start', async () => {
    worker.start()
    // Wait for initial async run
    await new Promise<void>(resolve => setTimeout(resolve, 100))
    expect(mockKpiCalculator.calculateKpis).toHaveBeenCalledWith('hotel-1', 'org-1', expect.any(Date), expect.any(Date))
  })

  it('upserts revenue metrics for each hotel', async () => {
    worker.start()
    await new Promise<void>(resolve => setTimeout(resolve, 100))
    expect(mockRevenueMetricRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        hotelId: 'hotel-1',
        organizationId: 'org-1',
        occupancyRate: 72,
        adr: 180,
      })
    )
  })

  it('invalidates KPI cache after aggregation', async () => {
    worker.start()
    await new Promise<void>(resolve => setTimeout(resolve, 100))
    expect(mockCache.invalidateKpis).toHaveBeenCalledWith('hotel-1')
  })

  it('handles KPI calculation failure gracefully (does not crash)', async () => {
    mockKpiCalculator.calculateKpis.mockRejectedValue(new Error('DB error'))
    worker.start()
    await new Promise<void>(resolve => setTimeout(resolve, 100))
    // Worker should still be running despite error
    expect(mockLogger.error).toHaveBeenCalled()
  })

  it('handles no active hotels gracefully', async () => {
    mockDb.booking.groupBy = jest.fn().mockResolvedValue([])
    worker.start()
    await new Promise<void>(resolve => setTimeout(resolve, 100))
    expect(mockKpiCalculator.calculateKpis).not.toHaveBeenCalled()
  })
})
