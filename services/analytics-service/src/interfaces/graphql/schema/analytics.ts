import { builder } from '../builder'
import { UnauthorizedError } from '@stayflexi/shared-errors'

const DailyMetricRef = builder.objectRef<any>('DailyMetric')
const KpiMetricsRef = builder.objectRef<any>('KpiMetrics')

builder.objectType(DailyMetricRef, {
  fields: (t) => ({
    date: t.exposeString('date'),
    occupancyRate: t.exposeFloat('occupancyRate'),
    adr: t.exposeFloat('adr'),
    revpar: t.exposeFloat('revpar'),
    totalRevenue: t.exposeFloat('totalRevenue'),
    bookingCount: t.exposeInt('bookingCount'),
  }),
})

builder.objectType(KpiMetricsRef, {
  fields: (t) => ({
    hotelId: t.exposeString('hotelId'),
    organizationId: t.exposeString('organizationId'),
    occupancyRate: t.exposeFloat('occupancyRate'),
    adr: t.exposeFloat('adr'),
    revpar: t.exposeFloat('revpar'),
    totalRevenue: t.exposeFloat('totalRevenue'),
    totalBookings: t.exposeInt('totalBookings'),
    cancellationRate: t.exposeFloat('cancellationRate'),
    dailyMetrics: t.field({
      type: [DailyMetricRef],
      resolve: (kpis) => kpis.dailyMetrics || [],
    }),
  }),
})

// Queries
builder.queryFields((t) => ({
  revenueMetrics: t.field({
    type: KpiMetricsRef,
    args: {
      hotelId: t.arg.string({ required: true }),
      startDate: t.arg.string({ required: true }),
      endDate: t.arg.string({ required: true }),
    },
    resolve: async (_root, { hotelId, startDate, endDate }, ctx) => {
      if (!ctx.organizationId) throw new UnauthorizedError('Unauthorized')
      
      const metrics = await ctx.getRevenueAnalytics.execute({
        hotelId,
        dateFrom: startDate,
        dateTo: endDate,
      }, ctx.organizationId)
      
      return metrics
    },
  }),
}))
