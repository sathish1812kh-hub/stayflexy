import type { PrismaClient } from '@prisma/client'
import { getPrismaClient } from '@stayflexi/shared-database'
import type { Logger } from '@stayflexi/shared-logger'
import type { IPaymentRepository } from '../domain/repositories/IPaymentRepository'

export interface ReconciliationReport {
  organizationId: string
  hotelId: string | null
  period: { startDate: string; endDate: string }
  payments: {
    totalCollected: number
    totalRefunded: number
    netRevenue: number
    transactionCount: number
    byMethod: Array<{ method: string; count: number; amount: number }>
  }
  bookings: {
    totalBookingValue: number
    confirmedBookingsCount: number
    cancelledBookingsCount: number
  }
  discrepancy: {
    hasDiscrepancy: boolean
    variance: number
    variancePercent: number
    explanation: string
  }
  currency: string
  generatedAt: string
}

export class ReconciliationService {
  constructor(
    private readonly paymentRepo: IPaymentRepository,
    private readonly db: PrismaClient = getPrismaClient(),
    private readonly logger: Logger
  ) {}

  async generateReport(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    hotelId?: string,
    currency = 'USD'
  ): Promise<ReconciliationReport> {
    this.logger.info({ organizationId, hotelId, startDate, endDate }, 'Generating reconciliation report')

    // Payment aggregation
    const paymentAgg = await this.paymentRepo.aggregateByPeriod(organizationId, hotelId, startDate, endDate)

    // Booking value aggregation
    const bookingWhere = {
      organizationId,
      ...(hotelId && { hotelId }),
      createdAt: { gte: startDate, lte: endDate },
      deletedAt: null,
    }

    const [bookingAgg, confirmedCount, cancelledCount] = await Promise.all([
      this.db.booking.aggregate({
        where: { ...bookingWhere, status: { notIn: ['CANCELLED'] } },
        _sum: { finalAmount: true },
      }),
      this.db.booking.count({ where: { ...bookingWhere, status: { notIn: ['CANCELLED'] } } }),
      this.db.booking.count({ where: { ...bookingWhere, status: 'CANCELLED' } }),
    ])

    const totalBookingValue = bookingAgg._sum.finalAmount?.toNumber() ?? 0
    const variance = totalBookingValue - paymentAgg.totalCollected
    const variancePercent = totalBookingValue > 0 ? (variance / totalBookingValue) * 100 : 0

    let explanation = 'Payments match booking values'
    if (Math.abs(variance) > 0.01) {
      if (variance > 0) {
        explanation = `${variance.toFixed(2)} ${currency} in bookings has not yet been collected`
      } else {
        explanation = `${Math.abs(variance).toFixed(2)} ${currency} collected exceeds booking values (possible overpayment or cross-booking payment)`
      }
    }

    return {
      organizationId,
      hotelId: hotelId ?? null,
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      payments: {
        totalCollected: paymentAgg.totalCollected,
        totalRefunded: paymentAgg.totalRefunded,
        netRevenue: paymentAgg.netRevenue,
        transactionCount: paymentAgg.transactionCount,
        byMethod: paymentAgg.byMethod,
      },
      bookings: {
        totalBookingValue,
        confirmedBookingsCount: confirmedCount,
        cancelledBookingsCount: cancelledCount,
      },
      discrepancy: {
        hasDiscrepancy: Math.abs(variance) > 0.01,
        variance: Math.round(variance * 100) / 100,
        variancePercent: Math.round(variancePercent * 100) / 100,
        explanation,
      },
      currency,
      generatedAt: new Date().toISOString(),
    }
  }
}
