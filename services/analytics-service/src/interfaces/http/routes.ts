import { Router } from 'express'
import type { AnalyticsController } from './AnalyticsController'

export function createAnalyticsApiRouter(controller: AnalyticsController): Router {
  const router = Router()

  // ── Analytics endpoints ───────────────────────────────────────────────────
  router.get('/api/v1/analytics/revenue', controller.getRevenue)
  router.get('/api/v1/analytics/occupancy', controller.getOccupancy)
  router.get('/api/v1/analytics/bookings', controller.getBookings)
  router.get('/api/v1/analytics/operations', controller.getOperations)
  router.get('/api/v1/analytics/forecast', controller.getForecast)
  router.get('/api/v1/analytics/dashboard', controller.getDashboard)

  // ── Persistent report generation ──────────────────────────────────────────
  router.post('/api/v1/analytics/reports/generate', controller.generateReport)
  router.get('/api/v1/analytics/reports/:id', controller.getReport)

  // ── Report endpoints (financial/occupancy/OTA inline reports) ────────────
  router.get('/api/v1/reports/financial', controller.getFinancialReport)
  router.get('/api/v1/reports/occupancy', controller.getOccupancyReport)
  router.get('/api/v1/reports/ota', controller.getOtaReport)
  router.get('/api/v1/reports/export', controller.exportReport)
  router.get('/api/v1/reports/export/:id', controller.getExportStatus)

  return router
}
