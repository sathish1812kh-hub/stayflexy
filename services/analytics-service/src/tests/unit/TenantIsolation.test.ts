/**
 * Tenant isolation tests — verify analytics queries always scope to organizationId.
 */
import { GetBookingAnalytics } from '../../application/use-cases/GetBookingAnalytics'
import { GetRevenueAnalytics } from '../../application/use-cases/GetRevenueAnalytics'
import { GetReport } from '../../application/use-cases/GetReport'
import { AnalyticsReport } from '../../domain/entities/AnalyticsReport'
import { ForbiddenError } from '@stayflexi/shared-errors'
import type { IAnalyticsReportRepository } from '../../domain/repositories/IAnalyticsReportRepository'
import type { IRevenueMetricRepository } from '../../domain/repositories/IRevenueMetricRepository'
import type { KpiCalculator } from '../../aggregators/KpiCalculator'
import type { AnalyticsCache } from '../../infrastructure/cache/AnalyticsCache'
import type { PrismaClient } from '@prisma/client'
import type { Logger } from '@stayflexi/shared-logger'

const mockLogger: Logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as unknown as Logger

const mockCache = {
  getKpis: jest.fn().mockResolvedValue(null),
  setKpis: jest.fn().mockResolvedValue(undefined),
  getDashboard: jest.fn().mockResolvedValue(null), setDashboard: jest.fn(),
  getOccupancy: jest.fn(), setOccupancy: jest.fn(),
  getRevenueReport: jest.fn().mockResolvedValue(null), setRevenueReport: jest.fn(),
  getForecast: jest.fn(), setForecast: jest.fn(),
  getExportStatus: jest.fn(), setExportStatus: jest.fn(),
  invalidateKpis: jest.fn(), invalidateHotel: jest.fn(),
} as unknown as jest.Mocked<AnalyticsCache>

const HOTEL_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const CORRECT_ORG = 'org-correct'
const WRONG_ORG = 'org-attacker'

describe('Tenant Isolation', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('GetBookingAnalytics', () => {
    it('always includes organizationId in the query where clause', async () => {
      const mockGroupBy = jest.fn().mockResolvedValue([])
      const mockAggregate = jest.fn().mockResolvedValue({ _count: { id: 0 }, _avg: { finalAmount: null } })
      const db = {
        booking: { groupBy: mockGroupBy, aggregate: mockAggregate },
      } as unknown as PrismaClient

      const useCase = new GetBookingAnalytics(db, mockCache, mockLogger)
      await useCase.execute({ hotelId: HOTEL_ID, dateFrom: '2024-01-01', dateTo: '2024-01-31' }, CORRECT_ORG)

      // All DB calls must include organizationId filter
      for (const call of mockGroupBy.mock.calls) {
        expect((call[0] as { where?: { organizationId?: string } }).where?.organizationId).toBe(CORRECT_ORG)
      }
    })

    it('different organization gets different scoped query', async () => {
      const mockGroupBy = jest.fn().mockResolvedValue([])
      const mockAggregate = jest.fn().mockResolvedValue({ _count: { id: 0 }, _avg: { finalAmount: null } })
      const db = {
        booking: { groupBy: mockGroupBy, aggregate: mockAggregate },
      } as unknown as PrismaClient

      const useCase = new GetBookingAnalytics(db, mockCache, mockLogger)
      await useCase.execute({ hotelId: HOTEL_ID, dateFrom: '2024-01-01', dateTo: '2024-01-31' }, WRONG_ORG)

      for (const call of mockGroupBy.mock.calls) {
        expect((call[0] as { where?: { organizationId?: string } }).where?.organizationId).toBe(WRONG_ORG)
      }
    })
  })

  describe('GetRevenueAnalytics', () => {
    it('includes organizationId when computing KPIs', async () => {
      const mockKpiCalculator = {
        calculateKpis: jest.fn().mockResolvedValue({
          hotelId: HOTEL_ID, organizationId: CORRECT_ORG,
          period: { from: '2024-01-01', to: '2024-01-31' },
          occupancyRate: 70, adr: 180, revpar: 126, totalRevenue: 5400,
          totalBookings: 30, cancellationRate: 5, averageStayDuration: 2,
          revenueByChannel: {}, revenueByRoomType: {},
        }),
      } as unknown as jest.Mocked<KpiCalculator>

      const mockRepo: jest.Mocked<IRevenueMetricRepository> = {
        findByHotelAndRange: jest.fn().mockResolvedValue([]),
        findByHotelAndDate: jest.fn(),
        upsert: jest.fn(),
        findByOrganization: jest.fn(),
      }

      const useCase = new GetRevenueAnalytics(mockRepo, mockKpiCalculator, mockCache, mockLogger)
      await useCase.execute({ hotelId: HOTEL_ID, dateFrom: '2024-01-01', dateTo: '2024-01-31' }, CORRECT_ORG)

      expect(mockKpiCalculator.calculateKpis).toHaveBeenCalledWith(
        HOTEL_ID, CORRECT_ORG, expect.any(Date), expect.any(Date)
      )
    })
  })

  describe('GetReport', () => {
    it('throws ForbiddenError when report belongs to a different organization', async () => {
      const now = new Date()
      const report = new AnalyticsReport({
        id: 'report-1',
        organizationId: CORRECT_ORG, // owned by correct org
        hotelId: 'hotel-1',
        reportType: 'FINANCIAL',
        reportStatus: 'COMPLETED',
        dateFrom: now, dateTo: now,
        format: 'json', reportData: null, errorMessage: null,
        requestedById: 'user-1', completedAt: now,
        expiresAt: new Date(now.getTime() + 86_400_000),
        createdAt: now, updatedAt: now,
      })

      const mockRepo: jest.Mocked<IAnalyticsReportRepository> = {
        create: jest.fn(),
        findById: jest.fn().mockResolvedValue(report),
        update: jest.fn(),
        findByOrganization: jest.fn(),
      }

      const useCase = new GetReport(mockRepo, mockLogger)
      await expect(useCase.execute('report-1', WRONG_ORG)).rejects.toThrow(ForbiddenError)
    })

    it('succeeds when organization matches', async () => {
      const now = new Date()
      const report = new AnalyticsReport({
        id: 'report-1', organizationId: CORRECT_ORG, hotelId: 'hotel-1',
        reportType: 'FINANCIAL', reportStatus: 'COMPLETED',
        dateFrom: now, dateTo: now, format: 'json', reportData: { summary: 'ok' },
        errorMessage: null, requestedById: 'user-1', completedAt: now,
        expiresAt: new Date(now.getTime() + 86_400_000), createdAt: now, updatedAt: now,
      })

      const mockRepo: jest.Mocked<IAnalyticsReportRepository> = {
        create: jest.fn(),
        findById: jest.fn().mockResolvedValue(report),
        update: jest.fn(),
        findByOrganization: jest.fn(),
      }

      const useCase = new GetReport(mockRepo, mockLogger)
      const result = await useCase.execute('report-1', CORRECT_ORG)
      expect(result.organizationId).toBe(CORRECT_ORG)
    })
  })
})
