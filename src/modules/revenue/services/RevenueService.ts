// FILE: src/modules/revenue/services/RevenueService.ts
import { BaseService } from '@lib/baseService'
import { prisma } from '@lib/prisma'
import { ForbiddenError } from '@errors/HttpError'
import type { PaginatedResult } from '@shared-types'
import type { PrismaRevenueMetricRepository } from '../repositories/PrismaRevenueMetricRepository'
import type { RevenueMetric, OccupancyResult, RevenueForecast } from '../types'
import type {
  RevenueMetricFilterDtoType,
  OccupancyQueryDtoType,
  ForecastQueryDtoType,
  ComparisonQueryDtoType,
  CreateCompetitorHotelDtoType,
  UpdateCompetitorHotelDtoType,
  UploadCompetitorPricesDtoType,
} from '../dto'
import { REVENUE_ERRORS, FORECAST_METHODOLOGY, DEFAULT_CONFIDENCE } from '../constants'
import { RevenueCalculator } from '../calculators'

export class RevenueService extends BaseService {
  protected readonly moduleName = 'RevenueService'

  constructor(private readonly metricRepo: PrismaRevenueMetricRepository) {
    super()
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async validateHotelAccess(
    hotelId: string,
    orgId: string,
  ): Promise<{ totalRooms: number }> {
    const hotel = await prisma.hotel.findFirst({
      where: { id: hotelId, organizationId: orgId, deletedAt: null },
      select: { id: true, totalRooms: true },
    })
    if (!hotel) throw new ForbiddenError(REVENUE_ERRORS.HOTEL_NOT_FOUND)
    return { totalRooms: hotel.totalRooms }
  }

  // ─── calculateDailyMetrics ────────────────────────────────────────────────────

  async calculateDailyMetrics(hotelId: string, date: Date, orgId: string): Promise<RevenueMetric> {
    return this.execute('calculateDailyMetrics', async () => {
      const { totalRooms } = await this.validateHotelAccess(hotelId, orgId)

      // Build date boundaries (UTC day)
      const startOfDay = new Date(date)
      startOfDay.setUTCHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setUTCHours(23, 59, 59, 999)

      // Count confirmed/in-progress bookings created on this date
      const [confirmedCount, cancelledCount] = await Promise.all([
        prisma.booking.count({
          where: {
            hotelId,
            status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
        prisma.booking.count({
          where: {
            hotelId,
            status: 'CANCELLED',
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
      ])

      const bookingCount = confirmedCount + cancelledCount

      // Count occupied rooms on this date
      const occupiedRooms = await prisma.bookingRoom.count({
        where: {
          hotelId,
          checkInDate: { lte: date },
          checkOutDate: { gt: date },
          status: { not: 'CANCELLED' },
        },
      })

      // Sum successful payments on this date
      const revenueResult = await prisma.payment.aggregate({
        where: {
          hotelId,
          paymentStatus: 'SUCCESS',
          paidAt: { gte: startOfDay, lt: endOfDay },
        },
        _sum: { amount: true },
      })
      const totalRevenue = revenueResult._sum.amount?.toNumber() ?? 0

      // Calculate metrics
      const occupancyRate = RevenueCalculator.calculateOccupancyRate(occupiedRooms, totalRooms)
      const adr = RevenueCalculator.calculateADR(totalRevenue, Math.max(1, occupiedRooms))
      const revpar = RevenueCalculator.calculateRevPAR(adr, occupancyRate)
      const cancellationRate = RevenueCalculator.calculateCancellationRate(
        cancelledCount,
        bookingCount,
      )

      // Upsert metric
      const metric = await this.metricRepo.upsertMetric({
        organizationId: orgId,
        hotelId,
        metricDate: startOfDay,
        occupancyRate,
        adr,
        revpar,
        totalRevenue,
        bookingCount,
        cancellationRate,
      })

      return metric
    })
  }

  // ─── getMetrics ───────────────────────────────────────────────────────────────

  async getMetrics(
    filter: RevenueMetricFilterDtoType,
    orgId: string,
  ): Promise<PaginatedResult<RevenueMetric>> {
    return this.execute('getMetrics', async () => {
      await this.validateHotelAccess(filter.hotelId, orgId)

      return this.metricRepo.findManyFiltered({
        organizationId: orgId,
        hotelId: filter.hotelId,
        startDate: filter.startDate ? new Date(filter.startDate) : undefined,
        endDate: filter.endDate ? new Date(filter.endDate) : undefined,
        page: filter.page,
        limit: filter.limit,
      })
    })
  }

  // ─── getOccupancy ─────────────────────────────────────────────────────────────

  async getOccupancy(dto: OccupancyQueryDtoType, orgId: string): Promise<OccupancyResult> {
    return this.execute('getOccupancy', async () => {
      const { totalRooms } = await this.validateHotelAccess(dto.hotelId, orgId)

      const date = new Date(dto.date)

      const occupiedRooms = await prisma.bookingRoom.count({
        where: {
          hotelId: dto.hotelId,
          checkInDate: { lte: date },
          checkOutDate: { gt: date },
          status: { not: 'CANCELLED' },
        },
      })

      const occupancyRate = RevenueCalculator.calculateOccupancyRate(occupiedRooms, totalRooms)

      return {
        hotelId: dto.hotelId,
        date,
        totalRooms,
        occupiedRooms,
        occupancyRate,
      }
    })
  }

  // ─── getForecast ──────────────────────────────────────────────────────────────

  async getForecast(dto: ForecastQueryDtoType, orgId: string): Promise<RevenueForecast> {
    return this.execute('getForecast', async () => {
      await this.validateHotelAccess(dto.hotelId, orgId)

      const endDate = new Date()
      const startDate = new Date()
      startDate.setUTCDate(startDate.getUTCDate() - 90)

      // Get last 90 days of metrics
      const historicalResult = await this.metricRepo.findManyFiltered({
        hotelId: dto.hotelId,
        startDate,
        endDate,
        page: 1,
        limit: 90,
      })

      const historicalMetrics = historicalResult.data.map((m) => ({
        metricDate: m.metricDate,
        occupancyRate: m.occupancyRate,
        totalRevenue: m.totalRevenue,
      }))

      const forecastDays = dto.forecastDays
      const periods = RevenueCalculator.forecastRevenue(
        historicalMetrics,
        forecastDays,
        DEFAULT_CONFIDENCE,
      )

      const forecastFrom = periods.length > 0 ? (periods[0]?.date ?? new Date()) : new Date()
      const forecastTo =
        periods.length > 0 ? (periods[periods.length - 1]?.date ?? new Date()) : new Date()

      return {
        hotelId: dto.hotelId,
        forecastFrom,
        forecastTo,
        periods,
        methodology: FORECAST_METHODOLOGY,
      }
    })
  }

  // ─── Rate Recommendations ──────────────────────────────────────────────────

  async listRateRecommendations(hotelId: string, orgId: string) {
    return this.execute('listRateRecommendations', async () => {
      await this.validateHotelAccess(hotelId, orgId)
      return prisma.rateRecommendation.findMany({
        where: { hotelId, organizationId: orgId },
        orderBy: { targetDate: 'asc' },
      })
    })
  }

  async generateMockRecommendations(hotelId: string, orgId: string) {
    return this.execute('generateMockRecommendations', async () => {
      await this.validateHotelAccess(hotelId, orgId)

      const roomTypes = await prisma.roomType.findMany({
        where: { hotelId, organizationId: orgId },
      })

      const today = new Date()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 1)

      for (let i = 0; i < 7; i++) {
        const target = new Date(today)
        target.setDate(today.getDate() + i)
        const targetDate = target.toISOString().split('T')[0] ?? ''

        for (const rt of roomTypes) {
          const basePrice = rt.basePrice.toNumber()
          const occupancyFactor = 1.05 + (i % 3) * 0.05
          const demandFactor = 1.0 + (i % 2) * 0.1
          const seasonalFactor = 1.0
          const recommendedPrice =
            Math.round(basePrice * occupancyFactor * demandFactor * 100) / 100

          await prisma.rateRecommendation.upsert({
            where: {
              hotelId_roomTypeId_targetDate: {
                hotelId,
                roomTypeId: rt.id,
                targetDate,
              },
            },
            update: {
              basePrice,
              recommendedPrice,
              minPrice: basePrice * 0.8,
              maxPrice: basePrice * 1.5,
              confidenceScore: 0.85,
              occupancyFactor,
              demandFactor,
              seasonalFactor,
              rationale: 'Algorithmic dynamic demand adjustment',
              expiresAt,
            },
            create: {
              organizationId: orgId,
              hotelId,
              roomTypeId: rt.id,
              targetDate,
              basePrice,
              recommendedPrice,
              minPrice: basePrice * 0.8,
              maxPrice: basePrice * 1.5,
              confidenceScore: 0.85,
              occupancyFactor,
              demandFactor,
              seasonalFactor,
              rationale: 'Algorithmic dynamic demand adjustment',
              expiresAt,
            },
          })
        }
      }

      return { success: true }
    })
  }

  async approveRateRecommendation(id: string, userId: string, orgId: string) {
    return this.execute('approveRateRecommendation', async () => {
      const rec = await prisma.rateRecommendation.findFirst({
        where: { id, organizationId: orgId },
      })
      if (!rec) {
        throw new ForbiddenError('Rate recommendation not found or access denied')
      }

      const invDate = new Date(rec.targetDate)

      const dynamicRate = await prisma.dynamicRate.upsert({
        where: {
          roomTypeId_inventoryDate: {
            roomTypeId: rec.roomTypeId,
            inventoryDate: invDate,
          },
        },
        update: {
          calculatedRate: rec.recommendedPrice,
          baseRate: rec.basePrice,
          occupancyFactor: rec.occupancyFactor,
          demandFactor: rec.demandFactor,
        },
        create: {
          organizationId: orgId,
          hotelId: rec.hotelId,
          roomTypeId: rec.roomTypeId,
          inventoryDate: invDate,
          calculatedRate: rec.recommendedPrice,
          baseRate: rec.basePrice,
          occupancyFactor: rec.occupancyFactor,
          demandFactor: rec.demandFactor,
        },
      })

      await prisma.pricingAuditLog.create({
        data: {
          organizationId: orgId,
          hotelId: rec.hotelId,
          roomTypeId: rec.roomTypeId,
          targetDate: rec.targetDate,
          actionType: 'RATE_COMPUTED',
          triggeredBy: 'MANUAL',
          previousPrice: rec.basePrice,
          newPrice: rec.recommendedPrice,
          performedBy: userId,
        },
      })

      await prisma.rateRecommendation.update({
        where: { id },
        data: { appliedAt: new Date() },
      })

      return dynamicRate
    })
  }

  async rejectRateRecommendation(id: string, orgId: string) {
    return this.execute('rejectRateRecommendation', async () => {
      const rec = await prisma.rateRecommendation.findFirst({
        where: { id, organizationId: orgId },
      })
      if (!rec) {
        throw new ForbiddenError('Rate recommendation not found or access denied')
      }

      await prisma.rateRecommendation.delete({
        where: { id },
      })

      return { success: true }
    })
  }

  // ─── Competitor Hotels ─────────────────────────────────────────────────────

  async listCompetitorHotels(hotelId: string, orgId: string) {
    return this.execute('listCompetitorHotels', async () => {
      await this.validateHotelAccess(hotelId, orgId)
      return prisma.competitorHotel.findMany({
        where: { hotelId, organizationId: orgId },
        include: { scrapedPrices: { take: 10, orderBy: { scrapedAt: 'desc' } } },
        orderBy: { name: 'asc' },
      })
    })
  }

  async createCompetitorHotel(dto: CreateCompetitorHotelDtoType, orgId: string) {
    return this.execute('createCompetitorHotel', async () => {
      await this.validateHotelAccess(dto.hotelId, orgId)
      return prisma.competitorHotel.create({
        data: {
          organizationId: orgId,
          hotelId: dto.hotelId,
          name: dto.name,
          location: dto.location,
          starRating: dto.starRating,
          pricingSegment: dto.pricingSegment,
          importance: dto.importance,
          isActive: dto.isActive,
        },
      })
    })
  }

  async updateCompetitorHotel(id: string, dto: UpdateCompetitorHotelDtoType, orgId: string) {
    return this.execute('updateCompetitorHotel', async () => {
      const existing = await prisma.competitorHotel.findFirst({
        where: { id, organizationId: orgId },
      })
      if (!existing) {
        throw new ForbiddenError('Competitor hotel not found or access denied')
      }
      return prisma.competitorHotel.update({
        where: { id },
        data: {
          name: dto.name,
          location: dto.location,
          starRating: dto.starRating,
          pricingSegment: dto.pricingSegment,
          importance: dto.importance,
          isActive: dto.isActive,
        },
      })
    })
  }

  async deleteCompetitorHotel(id: string, orgId: string) {
    return this.execute('deleteCompetitorHotel', async () => {
      const existing = await prisma.competitorHotel.findFirst({
        where: { id, organizationId: orgId },
      })
      if (!existing) {
        throw new ForbiddenError('Competitor hotel not found or access denied')
      }
      await prisma.competitorHotel.delete({ where: { id } })
      return { success: true }
    })
  }

  async uploadCompetitorPrices(dto: UploadCompetitorPricesDtoType, orgId: string) {
    return this.execute('uploadCompetitorPrices', async () => {
      await this.validateHotelAccess(dto.hotelId, orgId)
      const data = dto.prices.map((p) => ({
        organizationId: orgId,
        competitorHotelId: p.competitorHotelId,
        roomType: p.roomType,
        listedPrice: p.listedPrice,
        taxesIncluded: p.taxesIncluded,
        availability: p.availability,
        checkInDate: new Date(p.checkInDate),
        checkOutDate: new Date(p.checkOutDate),
        sourcePlatform: p.sourcePlatform,
      }))
      const result = await prisma.competitorScrapedPrice.createMany({ data })
      return { count: result.count }
    })
  }

  // ─── Comparison ────────────────────────────────────────────────────────────

  async compareRates(query: ComparisonQueryDtoType, orgId: string) {
    return this.execute('compareRates', async () => {
      await this.validateHotelAccess(query.hotelId, orgId)

      const competitors = await prisma.competitorHotel.findMany({
        where: { hotelId: query.hotelId, organizationId: orgId, isActive: true },
        include: { scrapedPrices: { take: 5, orderBy: { scrapedAt: 'desc' } } },
      })

      const dynamicRates = await prisma.dynamicRate.findMany({
        where: {
          hotelId: query.hotelId,
          organizationId: orgId,
          roomTypeId: query.roomTypeId,
        },
        take: 30,
        orderBy: { inventoryDate: 'asc' },
      })

      return {
        hotelId: query.hotelId,
        competitors,
        ourRates: dynamicRates,
      }
    })
  }

  // ─── Pricing Audit Logs ────────────────────────────────────────────────────

  async getPricingAuditLogs(hotelId: string, orgId: string) {
    return this.execute('getPricingAuditLogs', async () => {
      await this.validateHotelAccess(hotelId, orgId)
      return prisma.pricingAuditLog.findMany({
        where: { hotelId, organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
    })
  }
}
