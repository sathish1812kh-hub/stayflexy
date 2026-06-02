import { Router } from 'express'
import type { RevenueController } from './RevenueController'

export function createRevenueApiRouter(controller: RevenueController): Router {
  const router = Router()

  // Forecast generation
  router.post('/api/v1/revenue/forecast', controller.generateForecast)

  // Rate recommendations
  router.post('/api/v1/revenue/recommendations', controller.computeRecommendation)
  router.get('/api/v1/revenue/recommendations/:roomTypeId', controller.getRecommendation)

  // Revenue targets
  router.post('/api/v1/revenue/targets', controller.createTarget)
  router.get('/api/v1/revenue/targets/:hotelId', controller.listTargets)

  // Performance tracking
  router.get('/api/v1/revenue/performance/:hotelId/:targetPeriod', controller.getPerformance)

  return router
}
