import { z } from 'zod'

export const analyticsQuerySchema = z.object({
  hotelId: z.string().uuid(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateFrom must be YYYY-MM-DD'),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateTo must be YYYY-MM-DD'),
  organizationId: z.string().uuid().optional(),
})

export const dashboardQuerySchema = z.object({
  hotelId: z.string().uuid(),
})

export const forecastQuerySchema = z.object({
  hotelId: z.string().uuid(),
  days: z.string().optional().transform(v => v ? parseInt(v, 10) : 30).pipe(z.number().int().min(1).max(365)),
})

export const exportQuerySchema = z.object({
  hotelId: z.string().uuid(),
  reportType: z.enum(['financial', 'occupancy', 'ota', 'bookings']),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  format: z.enum(['csv', 'json']).default('csv'),
})

export const generateReportSchema = z.object({
  hotelId: z.string().uuid(),
  reportType: z.enum(['financial', 'occupancy', 'ota', 'bookings', 'operations', 'dashboard']),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  format: z.enum(['json', 'csv']).default('json'),
})

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>
export type ForecastQuery = z.infer<typeof forecastQuerySchema>
export type ExportQuery = z.infer<typeof exportQuerySchema>
export type GenerateReportDto = z.infer<typeof generateReportSchema>
