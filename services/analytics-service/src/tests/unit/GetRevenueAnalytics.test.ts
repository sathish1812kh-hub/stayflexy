import { GetRevenueAnalytics } from '../../application/use-cases/GetRevenueAnalytics'
import { BadRequestError } from '@stayflexi/shared-errors'
import { RevenueMetric } from '../../domain/entities/RevenueMetric'
import type { IRevenueMetricRepository } from '../../domain/repositories/IRevenueMetricRepository'
import type { KpiCalculator } from '../../aggregators/KpiCalculator'
import type { AnalyticsCache } from '../../infrastructure/cache/AnalyticsCache'
import type { Logger } from '@stayflexi/shared-logger'

const mockLogger: Logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger

const makeMetric = (date: string): RevenueMetric =>
  new RevenueMetric({
    id: 'metric-1',
    organizationId: 'org-1',
    hotelId: 'hotel-1',
    metricDate: new Date(date),
    occupancyRate: 75,
    adr: 200,
    revpar: 150,
    totalRevenue: 2000,
    bookingCount: 10,
    cancellationRate: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

const mockRevenueMetricRepo: jest.Mocked<IRevenueMetricRepository> = {
  findByHotelAndRange: jest.fn(),
  findByHotelAndDate: jest.fn(),
  upsert: jest.fn(),
  findByOrganization: jest.fn(),
}

const mockKpiCalculator = {
  calculateKpis: jest.fn(),
  calculateOccupancy: jest.fn(),
} as unknown as jest.Mocked<KpiCalculator>

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

describe('GetRevenueAnalytics', () => {
  let useCase: GetRevenueAnalytics

  const validQuery = {
    hotelId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    dateFrom: '2024-01-01',
    dateTo: '2024-01-07',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockCache.getKpis.mockResolvedValue(null)
    mockCache.setKpis.mockResolvedValue(undefined)
    mockRevenueMetricRepo.findByHotelAndRange.mockResolvedValue([])
    mockKpiCalculator.calculateKpis = jest.fn().mockResolvedValue({
      hotelId: validQuery.hotelId,
      organizationId: 'org-1',
      period: { from: '2024-01-01', to: '2024-01-07' },
      occupancyRate: 70,
      adr: 180,
      revpar: 126,
      totalRevenue: 1800,
      totalBookings: 10,
      cancellationRate: 5,
      averageStayDuration: 2,
      revenueByChannel: {},
      revenueByRoomType: {},
    })
    useCase = new GetRevenueAnalytics(mockRevenueMetricRepo, mockKpiCalculator, mockCache, mockLogger)
  })

  it('returns cached result on cache hit', async () => {
    const cached = { hotelId: validQuery.hotelId, totalRevenue: 999, dailyMetrics: [] }
    mockCache.getKpis.mockResolvedValue(cached)

    const result = await useCase.execute(validQuery, 'org-1')
    expect(result).toEqual(cached)
    expect(mockRevenueMetricRepo.findByHotelAndRange).not.toHaveBeenCalled()
    expect(mockKpiCalculator.calculateKpis).not.toHaveBeenCalled()
  })

  it('computes from pre-aggregated metrics when available', async () => {
    const metrics = [makeMetric('2024-01-01'), makeMetric('2024-01-02')]
    mockRevenueMetricRepo.findByHotelAndRange.mockResolvedValue(metrics)

    const result = await useCase.execute(validQuery, 'org-1')
    expect(result.dailyMetrics).toHaveLength(2)
    expect(result.totalBookings).toBe(20) // 10 + 10
    expect(result.totalRevenue).toBe(4000) // 2000 + 2000
    expect(mockKpiCalculator.calculateKpis).not.toHaveBeenCalled()
  })

  it('falls back to KpiCalculator when no pre-aggregated data', async () => {
    mockRevenueMetricRepo.findByHotelAndRange.mockResolvedValue([])

    const result = await useCase.execute(validQuery, 'org-1')
    expect(mockKpiCalculator.calculateKpis).toHaveBeenCalled()
    expect(result.dailyMetrics).toEqual([])
    expect(result.totalRevenue).toBe(1800)
  })

  it('throws BadRequestError for invalid date format', async () => {
    await expect(
      useCase.execute({ ...validQuery, dateFrom: 'not-a-date', dateTo: '2024-01-07' }, 'org-1'),
    ).rejects.toThrow(BadRequestError)
  })

  it('throws BadRequestError when dateFrom > dateTo', async () => {
    await expect(
      useCase.execute({ ...validQuery, dateFrom: '2024-01-10', dateTo: '2024-01-01' }, 'org-1'),
    ).rejects.toThrow(BadRequestError)
  })
})
