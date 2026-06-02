import type { Request, Response, NextFunction } from 'express'
import { successResponse, paginatedSuccess } from '@stayflexi/shared-types'
import type { GenerateForecast } from '../../application/use-cases/GenerateForecast'
import type { GetRateRecommendation } from '../../application/use-cases/GetRateRecommendation'
import type { CreateRevenueTarget } from '../../application/use-cases/CreateRevenueTarget'
import type { GetRevenuePerformance } from '../../application/use-cases/GetRevenuePerformance'

export class RevenueController {
  constructor(
    private readonly generateForecastUC: GenerateForecast,
    private readonly getRateRecommendationUC: GetRateRecommendation,
    private readonly createRevenueTargetUC: CreateRevenueTarget,
    private readonly getRevenuePerformanceUC: GetRevenuePerformance,
  ) {}

  // POST /api/v1/revenue/forecast
  generateForecast = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!
      const forecasts = await this.generateForecastUC.execute({
        ...req.body,
        organizationId: user.organizationId ?? req.body.organizationId,
      })
      res.status(201).json(successResponse(forecasts.map(f => f.toJSON()), user.correlationId))
    } catch (err) { next(err) }
  }

  // GET /api/v1/revenue/recommendations/:roomTypeId
  getRecommendation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!
      const { roomTypeId } = req.params
      const { targetDate, basePrice, currentOccupancy, hotelId, maxPrice, minPrice } = req.query as Record<string, string>
      const recommendation = await this.getRateRecommendationUC.execute({
        organizationId: user.organizationId!,
        hotelId: hotelId!,
        roomTypeId: roomTypeId!,
        targetDate: targetDate!,
        basePrice: Number(basePrice),
        currentOccupancy: Number(currentOccupancy),
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
      })
      res.json(successResponse(recommendation.toJSON(), user.correlationId))
    } catch (err) { next(err) }
  }

  // POST /api/v1/revenue/recommendations
  computeRecommendation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!
      const recommendation = await this.getRateRecommendationUC.execute({
        ...req.body,
        organizationId: user.organizationId ?? req.body.organizationId,
      })
      res.status(201).json(successResponse(recommendation.toJSON(), user.correlationId))
    } catch (err) { next(err) }
  }

  // POST /api/v1/revenue/targets
  createTarget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!
      const target = await this.createRevenueTargetUC.execute({
        ...req.body,
        organizationId: user.organizationId ?? req.body.organizationId,
        createdById: user.userId,
      })
      res.status(201).json(successResponse(target.toJSON(), user.correlationId))
    } catch (err) { next(err) }
  }

  // GET /api/v1/revenue/targets/:hotelId
  listTargets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!
      const { hotelId } = req.params
      const targets = await this.getRevenuePerformanceUC.listByHotel(hotelId!, user.organizationId!)
      res.json(successResponse(targets.map(t => t.toJSON()), user.correlationId))
    } catch (err) { next(err) }
  }

  // GET /api/v1/revenue/performance/:hotelId/:targetPeriod
  getPerformance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!
      const { hotelId, targetPeriod } = req.params
      const performance = await this.getRevenuePerformanceUC.execute(hotelId!, targetPeriod!, user.organizationId!)
      res.json(successResponse({
        target: performance.target.toJSON(),
        achievementPercent: performance.achievementPercent,
        revParAchievementPercent: performance.revParAchievementPercent,
        isOnTrack: performance.isOnTrack,
        variance: performance.variance,
      }, user.correlationId))
    } catch (err) { next(err) }
  }
}
