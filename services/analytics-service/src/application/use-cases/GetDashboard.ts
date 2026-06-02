import type { PrismaClient } from '@prisma/client'
import type { KpiCalculator } from '../../aggregators/KpiCalculator'
import type { AnalyticsCache } from '../../infrastructure/cache/AnalyticsCache'
import type { Logger } from '@stayflexi/shared-logger'

export interface DashboardMetrics {
  hotelId: string
  organizationId: string
  generatedAt: string
  today: {
    date: string
    occupancyRate: number
    occupied: number
    totalRooms: number
    checkIns: number
    checkOuts: number
    newBookings: number
  }
  last7Days: {
    revenue: number
    bookings: number
    avgOccupancyRate: number
    cancellations: number
  }
  last30Days: {
    revenue: number
    bookings: number
    adr: number
    revpar: number
    cancellationRate: number
  }
  pendingTasks: {
    housekeeping: number
    maintenance: number
  }
}

export class GetDashboard {
  constructor(
    private readonly db: PrismaClient,
    private readonly kpiCalculator: KpiCalculator,
    private readonly cache: AnalyticsCache,
    private readonly logger: Logger,
  ) {}

  async execute(hotelId: string, organizationId: string): Promise<DashboardMetrics> {
    const cached = await this.cache.getDashboard(hotelId)
    if (cached) {
      this.logger.debug({ hotelId }, 'Dashboard cache hit')
      return cached as DashboardMetrics
    }

    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)

    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    const [
      todayOccupancy,
      checkIns,
      checkOuts,
      newBookings,
      last7DaysPayments,
      last7DaysBookings,
      last7DaysCancellations,
      last30DaysKpis,
      pendingHousekeeping,
      pendingMaintenance,
    ] = await Promise.all([
      this.kpiCalculator.calculateOccupancy(hotelId, todayStart, todayEnd),
      this.db.booking.count({
        where: { hotelId, checkedInAt: { gte: todayStart, lte: todayEnd }, deletedAt: null },
      }),
      this.db.booking.count({
        where: { hotelId, checkedOutAt: { gte: todayStart, lte: todayEnd }, deletedAt: null },
      }),
      this.db.booking.count({
        where: { hotelId, createdAt: { gte: todayStart, lte: todayEnd }, deletedAt: null },
      }),
      this.db.payment.aggregate({
        where: { hotelId, paymentStatus: 'SUCCESS', createdAt: { gte: sevenDaysAgo } },
        _sum: { amount: true },
      }),
      this.db.booking.count({
        where: { hotelId, createdAt: { gte: sevenDaysAgo }, deletedAt: null },
      }),
      this.db.booking.count({
        where: { hotelId, status: 'CANCELLED', createdAt: { gte: sevenDaysAgo }, deletedAt: null },
      }),
      this.kpiCalculator.calculateKpis(hotelId, organizationId, thirtyDaysAgo, now),
      this.db.housekeepingTask.count({
        where: { hotelId, taskStatus: { in: ['PENDING', 'IN_PROGRESS'] } },
      }),
      this.db.maintenanceTicket.count({
        where: { hotelId, ticketStatus: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
    ])

    const todayData = todayOccupancy[0]
    const hotel = await this.db.hotel.findUnique({ where: { id: hotelId }, select: { totalRooms: true } })
    const totalRooms = hotel?.totalRooms ?? 0

    // Compute 7-day avg occupancy from daily data
    const last7DaysOccupancyData = await this.kpiCalculator.calculateOccupancy(hotelId, sevenDaysAgo, now)
    const avgOccupancyRate = last7DaysOccupancyData.length > 0
      ? last7DaysOccupancyData.reduce((acc, d) => acc + d.rate, 0) / last7DaysOccupancyData.length
      : 0

    const result: DashboardMetrics = {
      hotelId,
      organizationId,
      generatedAt: now.toISOString(),
      today: {
        date: todayStart.toISOString().split('T')[0] ?? '',
        occupancyRate: todayData?.rate ?? 0,
        occupied: todayData?.occupied ?? 0,
        totalRooms,
        checkIns,
        checkOuts,
        newBookings,
      },
      last7Days: {
        revenue: last7DaysPayments._sum.amount?.toNumber() ?? 0,
        bookings: last7DaysBookings,
        avgOccupancyRate: Math.round(avgOccupancyRate * 100) / 100,
        cancellations: last7DaysCancellations,
      },
      last30Days: {
        revenue: last30DaysKpis.totalRevenue,
        bookings: last30DaysKpis.totalBookings,
        adr: last30DaysKpis.adr,
        revpar: last30DaysKpis.revpar,
        cancellationRate: last30DaysKpis.cancellationRate,
      },
      pendingTasks: {
        housekeeping: pendingHousekeeping,
        maintenance: pendingMaintenance,
      },
    }

    await this.cache.setDashboard(hotelId, result)
    this.logger.debug({ hotelId }, 'Dashboard generated and cached')
    return result
  }
}
