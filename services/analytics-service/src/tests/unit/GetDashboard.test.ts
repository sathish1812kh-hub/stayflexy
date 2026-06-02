import { GetDashboard } from '../../application/use-cases/GetDashboard'
import type { KpiCalculator } from '../../aggregators/KpiCalculator'
import type { AnalyticsCache } from '../../infrastructure/cache/AnalyticsCache'
import type { PrismaClient } from '@prisma/client'
import type { Logger } from '@stayflexi/shared-logger'

const mockLogger: Logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as unknown as Logger

const makeDecimal = (n: number) => ({ toNumber: () => n })

function makeDb(opts: {
  occupancy?: Array<{ date: string; occupied: number; total: number; rate: number }>
  checkIns?: number
  checkOuts?: number
  newBookings?: number
  last7Revenue?: unknown
  last7Bookings?: number
  last7Cancellations?: number
  kpis?: unknown
  pendingHousekeeping?: number
  pendingMaintenance?: number
  hotel?: unknown
} = {}): PrismaClient {
  const defaultKpis = {
    hotelId: 'hotel-1', organizationId: 'org-1',
    period: { from: '2024-01-01', to: '2024-01-31' },
    occupancyRate: 72, adr: 180, revpar: 129.6, totalRevenue: 5400,
    totalBookings: 30, cancellationRate: 10, averageStayDuration: 2,
    revenueByChannel: {}, revenueByRoomType: {},
  }
  return {
    booking: {
      count: jest.fn().mockResolvedValue(opts.checkIns ?? 3),
    },
    payment: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: opts.last7Revenue ?? makeDecimal(2500) } }),
    },
    hotel: {
      findUnique: jest.fn().mockResolvedValue(opts.hotel ?? { totalRooms: 20 }),
    },
    housekeepingTask: {
      count: jest.fn().mockResolvedValue(opts.pendingHousekeeping ?? 5),
    },
    maintenanceTicket: {
      count: jest.fn().mockResolvedValue(opts.pendingMaintenance ?? 2),
    },
  } as unknown as PrismaClient
}

const mockKpiCalculator = {
  calculateOccupancy: jest.fn().mockResolvedValue([
    { date: '2024-01-15', occupied: 14, total: 20, rate: 70 },
  ]),
  calculateKpis: jest.fn().mockResolvedValue({
    hotelId: 'hotel-1', organizationId: 'org-1',
    period: { from: '2024-01-01', to: '2024-01-31' },
    occupancyRate: 72, adr: 180, revpar: 129.6, totalRevenue: 5400,
    totalBookings: 30, cancellationRate: 10, averageStayDuration: 2,
    revenueByChannel: {}, revenueByRoomType: {},
  }),
} as unknown as jest.Mocked<KpiCalculator>

const mockCache = {
  getDashboard: jest.fn().mockResolvedValue(null),
  setDashboard: jest.fn().mockResolvedValue(undefined),
  invalidateHotel: jest.fn(),
  getKpis: jest.fn(), setKpis: jest.fn(), invalidateKpis: jest.fn(),
  getOccupancy: jest.fn(), setOccupancy: jest.fn(),
  getRevenueReport: jest.fn(), setRevenueReport: jest.fn(),
  getForecast: jest.fn(), setForecast: jest.fn(),
  getExportStatus: jest.fn(), setExportStatus: jest.fn(),
} as unknown as jest.Mocked<AnalyticsCache>

describe('GetDashboard', () => {
  let useCase: GetDashboard

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new GetDashboard(makeDb(), mockKpiCalculator, mockCache, mockLogger)
  })

  it('returns dashboard metrics with correct structure', async () => {
    const result = await useCase.execute('hotel-1', 'org-1')

    expect(result).toMatchObject({
      hotelId: 'hotel-1',
      organizationId: 'org-1',
    })
    expect(result.today).toBeDefined()
    expect(result.last7Days).toBeDefined()
    expect(result.last30Days).toBeDefined()
    expect(result.pendingTasks).toBeDefined()
    expect(typeof result.generatedAt).toBe('string')
  })

  it('returns cached result on cache hit', async () => {
    const cached = {
      hotelId: 'hotel-1', organizationId: 'org-1',
      generatedAt: new Date().toISOString(),
      today: { date: '2024-01-15', occupancyRate: 70, occupied: 14, totalRooms: 20, checkIns: 2, checkOuts: 1, newBookings: 3 },
      last7Days: { revenue: 2500, bookings: 10, avgOccupancyRate: 68, cancellations: 1 },
      last30Days: { revenue: 5400, bookings: 30, adr: 180, revpar: 129.6, cancellationRate: 10 },
      pendingTasks: { housekeeping: 5, maintenance: 2 },
    }
    mockCache.getDashboard.mockResolvedValue(cached)

    const result = await useCase.execute('hotel-1', 'org-1')
    expect(result).toEqual(cached)
    expect(mockKpiCalculator.calculateKpis).not.toHaveBeenCalled()
  })

  it('caches the result after generating', async () => {
    await useCase.execute('hotel-1', 'org-1')
    expect(mockCache.setDashboard).toHaveBeenCalledWith('hotel-1', expect.objectContaining({ hotelId: 'hotel-1' }))
  })

  it('today occupancy comes from calculateOccupancy', async () => {
    mockKpiCalculator.calculateOccupancy.mockResolvedValue([
      { date: '2024-01-15', occupied: 16, total: 20, rate: 80 },
    ])
    const result = await useCase.execute('hotel-1', 'org-1')
    expect(result.today.occupancyRate).toBe(80)
    expect(result.today.occupied).toBe(16)
  })

  it('handles empty occupancy for today gracefully', async () => {
    mockKpiCalculator.calculateOccupancy.mockResolvedValue([])
    const result = await useCase.execute('hotel-1', 'org-1')
    expect(result.today.occupancyRate).toBe(0)
    expect(result.today.occupied).toBe(0)
  })

  it('includes pending task counts', async () => {
    const db = makeDb({ pendingHousekeeping: 8, pendingMaintenance: 3 })
    const uc = new GetDashboard(db, mockKpiCalculator, mockCache, mockLogger)
    const result = await uc.execute('hotel-1', 'org-1')
    expect(result.pendingTasks.housekeeping).toBe(8)
    expect(result.pendingTasks.maintenance).toBe(3)
  })
})
