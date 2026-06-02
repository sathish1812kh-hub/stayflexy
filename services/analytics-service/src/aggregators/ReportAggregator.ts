import type { PrismaClient } from '@prisma/client'
import type { Logger } from '@stayflexi/shared-logger'
import type { IRevenueMetricRepository } from '../domain/repositories/IRevenueMetricRepository'
import type { IAnalyticsSnapshotRepository } from '../domain/repositories/IAnalyticsSnapshotRepository'
import type { KpiCalculator } from './KpiCalculator'

export interface FinancialReport {
  hotelId: string
  organizationId: string
  period: { from: string; to: string }
  revenue: {
    total: number
    byMethod: Array<{ method: string; amount: number; count: number }>
    collected: number
    refunded: number
    net: number
  }
  bookings: {
    total: number
    confirmed: number
    checkedOut: number
    cancelled: number
    noShow: number
    avgValue: number
  }
  kpis: { adr: number; revpar: number; occupancyRate: number; cancellationRate: number }
}

export interface OccupancyReport {
  hotelId: string
  period: { from: string; to: string }
  totalRooms: number
  avgOccupancyRate: number
  peakOccupancyDate: string
  peakOccupancyRate: number
  lowestOccupancyDate: string
  lowestOccupancyRate: number
  daily: Array<{ date: string; occupied: number; total: number; rate: number }>
}

export interface OtaReport {
  hotelId: string
  period: { from: string; to: string }
  syncJobs: { total: number; succeeded: number; failed: number; successRate: number }
  reservations: { total: number; imported: number; pending: number; failed: number }
  byProvider: Array<{ providerId: string; totalSyncs: number; totalReservations: number; successRate: number }>
}

export class ReportAggregator {
  constructor(
    private readonly db: PrismaClient,
    private readonly revenueMetricRepo: IRevenueMetricRepository,
    private readonly snapshotRepo: IAnalyticsSnapshotRepository,
    private readonly kpiCalculator: KpiCalculator,
    private readonly logger: Logger,
  ) {}

  async generateFinancialReport(hotelId: string, organizationId: string, from: Date, to: Date): Promise<FinancialReport> {
    this.logger.info({ hotelId, from, to }, 'Generating financial report')

    const [kpis, paymentByMethod, refundAgg, bookingStats, bookingByStatus] = await Promise.all([
      this.kpiCalculator.calculateKpis(hotelId, organizationId, from, to),
      this.db.payment.groupBy({
        by: ['paymentMethod'],
        where: { hotelId, paymentStatus: 'SUCCESS', createdAt: { gte: from, lte: to } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.db.refund.aggregate({
        where: { payment: { hotelId, createdAt: { gte: from, lte: to } } },
        _sum: { refundAmount: true },
      }),
      this.db.booking.aggregate({
        where: { hotelId, createdAt: { gte: from, lte: to }, deletedAt: null },
        _count: { id: true },
        _avg: { finalAmount: true },
      }),
      this.db.booking.groupBy({
        by: ['status'],
        where: { hotelId, createdAt: { gte: from, lte: to }, deletedAt: null },
        _count: { id: true },
      }),
    ])

    const byMethodMapped = paymentByMethod.map(r => ({
      method: r.paymentMethod,
      amount: r._sum.amount?.toNumber() ?? 0,
      count: r._count.id,
    }))
    const collected = byMethodMapped.reduce((acc, r) => acc + r.amount, 0)
    const refunded = refundAgg._sum.refundAmount?.toNumber() ?? 0

    const bookingStatusMap: Record<string, number> = {}
    for (const row of bookingByStatus) {
      bookingStatusMap[row.status] = row._count.id
    }

    return {
      hotelId, organizationId,
      period: { from: from.toISOString().split('T')[0] ?? '', to: to.toISOString().split('T')[0] ?? '' },
      revenue: {
        total: kpis.totalRevenue,
        byMethod: byMethodMapped,
        collected,
        refunded,
        net: collected - refunded,
      },
      bookings: {
        total: bookingStats._count.id,
        confirmed: bookingStatusMap['CONFIRMED'] ?? 0,
        checkedOut: bookingStatusMap['CHECKED_OUT'] ?? 0,
        cancelled: bookingStatusMap['CANCELLED'] ?? 0,
        noShow: bookingStatusMap['NO_SHOW'] ?? 0,
        avgValue: bookingStats._avg.finalAmount?.toNumber() ?? 0,
      },
      kpis: { adr: kpis.adr, revpar: kpis.revpar, occupancyRate: kpis.occupancyRate, cancellationRate: kpis.cancellationRate },
    }
  }

  async generateOccupancyReport(hotelId: string, from: Date, to: Date): Promise<OccupancyReport> {
    this.logger.info({ hotelId, from, to }, 'Generating occupancy report')
    const hotel = await this.db.hotel.findUnique({ where: { id: hotelId }, select: { totalRooms: true } })
    const daily = await this.kpiCalculator.calculateOccupancy(hotelId, from, to)
    const totalRooms = hotel?.totalRooms ?? 0
    const avgOccupancyRate = daily.length > 0
      ? daily.reduce((acc, d) => acc + d.rate, 0) / daily.length
      : 0
    const peakDay = daily.reduce((a, b) => a.rate >= b.rate ? a : b, { date: '', rate: 0, occupied: 0, total: 0 })
    const lowestDay = daily.reduce((a, b) => a.rate <= b.rate ? a : b, { date: '', rate: 100, occupied: 0, total: 0 })

    return {
      hotelId,
      period: { from: from.toISOString().split('T')[0] ?? '', to: to.toISOString().split('T')[0] ?? '' },
      totalRooms,
      avgOccupancyRate: Math.round(avgOccupancyRate * 100) / 100,
      peakOccupancyDate: peakDay.date,
      peakOccupancyRate: peakDay.rate,
      lowestOccupancyDate: lowestDay.date,
      lowestOccupancyRate: lowestDay.rate,
      daily,
    }
  }

  async generateOtaReport(hotelId: string, from: Date, to: Date): Promise<OtaReport> {
    this.logger.info({ hotelId, from, to }, 'Generating OTA report')
    const [syncJobStats, reservationStats, syncByProvider, resByProvider] = await Promise.all([
      this.db.syncJob.groupBy({
        by: ['syncStatus'],
        where: { hotelId, createdAt: { gte: from, lte: to } },
        _count: { id: true },
      }),
      this.db.oTAReservation.groupBy({
        by: ['syncStatus'],
        where: { hotelId, createdAt: { gte: from, lte: to } },
        _count: { id: true },
      }),
      this.db.syncJob.groupBy({
        by: ['providerId', 'syncStatus'],
        where: { hotelId, createdAt: { gte: from, lte: to } },
        _count: { id: true },
      }),
      this.db.oTAReservation.groupBy({
        by: ['providerId'],
        where: { hotelId, createdAt: { gte: from, lte: to } },
        _count: { id: true },
      }),
    ])

    const syncStatusMap: Record<string, number> = {}
    for (const row of syncJobStats) { syncStatusMap[row.syncStatus] = row._count.id }
    const totalSyncs = Object.values(syncStatusMap).reduce((a, b) => a + b, 0)
    const succeededSyncs = syncStatusMap['SUCCESS'] ?? 0

    const resStatusMap: Record<string, number> = {}
    for (const row of reservationStats) { resStatusMap[row.syncStatus] = row._count.id }

    // Aggregate by provider
    const providerMap = new Map<string, { total: number; success: number }>()
    for (const row of syncByProvider) {
      const existing = providerMap.get(row.providerId) ?? { total: 0, success: 0 }
      existing.total += row._count.id
      if (row.syncStatus === 'SUCCESS') existing.success += row._count.id
      providerMap.set(row.providerId, existing)
    }
    const resByProviderMap = new Map<string, number>()
    for (const row of resByProvider) { resByProviderMap.set(row.providerId, row._count.id) }

    const byProvider = Array.from(providerMap.entries()).map(([providerId, stats]) => ({
      providerId,
      totalSyncs: stats.total,
      totalReservations: resByProviderMap.get(providerId) ?? 0,
      successRate: stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0,
    }))

    return {
      hotelId,
      period: { from: from.toISOString().split('T')[0] ?? '', to: to.toISOString().split('T')[0] ?? '' },
      syncJobs: {
        total: totalSyncs,
        succeeded: succeededSyncs,
        failed: syncStatusMap['FAILED'] ?? 0,
        successRate: totalSyncs > 0 ? Math.round((succeededSyncs / totalSyncs) * 100) : 0,
      },
      reservations: {
        total: Object.values(resStatusMap).reduce((a, b) => a + b, 0),
        imported: resStatusMap['IMPORTED'] ?? 0,
        pending: resStatusMap['PENDING'] ?? 0,
        failed: resStatusMap['FAILED'] ?? 0,
      },
      byProvider,
    }
  }
}
