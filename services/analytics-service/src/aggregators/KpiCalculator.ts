import type { PrismaClient } from '@prisma/client'
import type { KpiMetrics } from '../domain/value-objects/KpiMetrics'
import type { Logger } from '@stayflexi/shared-logger'

export class KpiCalculator {
  constructor(
    private readonly db: PrismaClient,
    private readonly logger: Logger,
  ) {}

  async calculateKpis(
    hotelId: string,
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<KpiMetrics> {
    const [hotel, bookingStats, paymentStats, cancellationStats, channelRevenue] = await Promise.all([
      this.db.hotel.findUnique({ where: { id: hotelId }, select: { totalRooms: true } }),
      this.db.booking.aggregate({
        where: { hotelId, createdAt: { gte: from, lte: to }, deletedAt: null },
        _count: { id: true },
        _avg: { finalAmount: true },
      }),
      this.db.payment.aggregate({
        where: { hotelId, paymentStatus: 'SUCCESS', createdAt: { gte: from, lte: to } },
        _sum: { amount: true },
      }),
      this.db.booking.count({
        where: { hotelId, status: 'CANCELLED', createdAt: { gte: from, lte: to }, deletedAt: null },
      }),
      this.db.booking.groupBy({
        by: ['source'],
        where: { hotelId, createdAt: { gte: from, lte: to }, deletedAt: null, status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
        _sum: { finalAmount: true },
      }),
    ])

    const totalRooms = hotel?.totalRooms ?? 1
    const dayCount = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1)
    const availableRoomNights = totalRooms * dayCount
    const totalBookings = bookingStats._count.id
    const totalRevenue = paymentStats._sum.amount?.toNumber() ?? 0
    const occupancyRate = availableRoomNights > 0
      ? Math.min((totalBookings / availableRoomNights) * 100, 100)
      : 0
    const adr = totalBookings > 0 ? totalRevenue / totalBookings : 0
    const revpar = adr * (occupancyRate / 100)
    const cancellationRate = totalBookings > 0
      ? (cancellationStats / totalBookings) * 100
      : 0

    // Average stay duration from checked out bookings
    const checkedOutBookings = await this.db.booking.findMany({
      where: { hotelId, status: 'CHECKED_OUT', createdAt: { gte: from, lte: to }, deletedAt: null },
      select: { checkedInAt: true, checkedOutAt: true },
    })
    const avgStayDuration = checkedOutBookings.length > 0
      ? checkedOutBookings.reduce((acc, b) => {
          if (!b.checkedInAt || !b.checkedOutAt) return acc
          const nights = Math.ceil((b.checkedOutAt.getTime() - b.checkedInAt.getTime()) / 86400000)
          return acc + nights
        }, 0) / checkedOutBookings.length
      : 0

    // Revenue by channel
    const revenueByChannel: Record<string, number> = {}
    for (const row of channelRevenue) {
      revenueByChannel[row.source] = row._sum.finalAmount?.toNumber() ?? 0
    }

    // Revenue by room type (via booking rooms)
    const roomTypeRevenue = await this.db.bookingRoom.groupBy({
      by: ['roomTypeId'],
      where: { booking: { hotelId, createdAt: { gte: from, lte: to }, deletedAt: null, status: { notIn: ['CANCELLED'] } } },
      _sum: { totalRoomAmount: true },
    })
    const revenueByRoomType: Record<string, number> = {}
    for (const row of roomTypeRevenue) {
      if (row.roomTypeId) {
        revenueByRoomType[row.roomTypeId] = row._sum.totalRoomAmount?.toNumber() ?? 0
      }
    }

    this.logger.debug({ hotelId, totalRevenue, adr, revpar, occupancyRate }, 'KPI calculation complete')

    return {
      hotelId, organizationId,
      period: { from: from.toISOString().split('T')[0] ?? '', to: to.toISOString().split('T')[0] ?? '' },
      occupancyRate: Math.round(occupancyRate * 100) / 100,
      adr: Math.round(adr * 100) / 100,
      revpar: Math.round(revpar * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalBookings,
      cancellationRate: Math.round(cancellationRate * 100) / 100,
      averageStayDuration: Math.round(avgStayDuration * 100) / 100,
      revenueByChannel,
      revenueByRoomType,
    }
  }

  async calculateOccupancy(hotelId: string, from: Date, to: Date): Promise<Array<{ date: string; occupied: number; total: number; rate: number }>> {
    const hotel = await this.db.hotel.findUnique({ where: { id: hotelId }, select: { totalRooms: true } })
    const totalRooms = hotel?.totalRooms ?? 0

    const result: Array<{ date: string; occupied: number; total: number; rate: number }> = []
    const current = new Date(from)
    while (current <= to) {
      const dayEnd = new Date(current)
      dayEnd.setDate(dayEnd.getDate() + 1)

      // Use BookingRoom.checkInDate/checkOutDate (non-nullable dates) for accurate occupancy
      const occupied = await this.db.bookingRoom.count({
        where: {
          booking: {
            hotelId,
            deletedAt: null,
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          },
          checkInDate: { lt: dayEnd },
          checkOutDate: { gt: current },
        },
      })

      result.push({
        date: current.toISOString().split('T')[0] ?? '',
        occupied,
        total: totalRooms,
        rate: totalRooms > 0 ? Math.round((occupied / totalRooms) * 10000) / 100 : 0,
      })
      current.setDate(current.getDate() + 1)
    }
    return result
  }
}
