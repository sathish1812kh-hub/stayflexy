import { builder } from '../builder'
import { UnauthorizedError } from '@stayflexi/shared-errors'

interface DailyMetricShape {
  date: string
  occupancyRate: number
  adr: number
  revpar: number
  totalRevenue: number
  bookingCount: number
}

interface KpiMetricsShape {
  hotelId: string
  organizationId: string
  occupancyRate: number
  adr: number
  revpar: number
  totalRevenue: number
  totalBookings: number
  cancellationRate: number
  dailyMetrics?: DailyMetricShape[]
}

const DailyMetricRef = builder.objectRef<DailyMetricShape>('DailyMetric')
const KpiMetricsRef = builder.objectRef<KpiMetricsShape>('KpiMetrics')

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
    resolve: async (_root, { hotelId, startDate, endDate }, ctx): Promise<KpiMetricsShape> => {
      if (!ctx.organizationId) throw new UnauthorizedError('Unauthorized')

      const metrics = await ctx.getRevenueAnalytics.execute(
        {
          hotelId,
          dateFrom: startDate,
          dateTo: endDate,
        },
        ctx.organizationId,
      )

      return metrics as unknown as KpiMetricsShape
    },
  }),
}))
