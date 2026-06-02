import type { Request, Response, NextFunction } from 'express'
import { successResponse, paginatedSuccess } from '@stayflexi/shared-types'
import type { CreatePricingRule } from '../../application/use-cases/CreatePricingRule'
import type { ComputeDynamicRate } from '../../application/use-cases/ComputeDynamicRate'
import type { GetCurrentRate } from '../../application/use-cases/GetCurrentRate'
import type { ApplySurgePricing } from '../../application/use-cases/ApplySurgePricing'
import type { ListPricingRules } from '../../application/use-cases/ListPricingRules'
import type { SyncOtaRates } from '../../application/use-cases/SyncOtaRates'

export class PricingController {
  constructor(
    private readonly createPricingRuleUC: CreatePricingRule,
    private readonly computeDynamicRateUC: ComputeDynamicRate,
    private readonly getCurrentRateUC: GetCurrentRate,
    private readonly applySurgePricingUC: ApplySurgePricing,
    private readonly listPricingRulesUC: ListPricingRules,
    private readonly syncOtaRatesUC: SyncOtaRates,
  ) {}

  // POST /api/v1/pricing/rules
  createRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!
      const rule = await this.createPricingRuleUC.execute({
        ...req.body,
        organizationId: user.organizationId ?? req.body.organizationId,
        createdById: user.userId,
      })
      res.status(201).json(successResponse(rule.toJSON(), user.correlationId))
    } catch (err) { next(err) }
  }

  // GET /api/v1/pricing/rules
  listRules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!
      const result = await this.listPricingRulesUC.execute(user.organizationId!, {
        hotelId: req.query['hotelId'] as string | undefined,
        roomTypeId: req.query['roomTypeId'] as string | undefined,
        status: req.query['status'] as string | undefined,
        page: req.query['page'] ? Number(req.query['page']) : undefined,
        limit: req.query['limit'] ? Number(req.query['limit']) : undefined,
      })
      res.json(paginatedSuccess(result.data.map(r => r.toJSON()), result.meta, user.correlationId))
    } catch (err) { next(err) }
  }

  // POST /api/v1/pricing/compute
  computeRate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!
      const { roomTypeId, targetDate, baseRate, currentOccupancy, demandFactor, hotelId } = req.body
      const rate = await this.computeDynamicRateUC.execute({
        organizationId: user.organizationId!,
        hotelId,
        roomTypeId,
        targetDate: new Date(targetDate),
        baseRate: Number(baseRate),
        currentOccupancy: Number(currentOccupancy),
        demandFactor: demandFactor ? Number(demandFactor) : undefined,
      })
      res.json(successResponse(rate.toJSON(), user.correlationId))
    } catch (err) { next(err) }
  }

  // GET /api/v1/pricing/rates/:roomTypeId
  getRate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!
      const { roomTypeId } = req.params
      const date = req.query['date'] ? new Date(req.query['date'] as string) : new Date()
      const rate = await this.getCurrentRateUC.execute(roomTypeId!, date, user.organizationId!)
      res.json(successResponse(rate.toJSON(), user.correlationId))
    } catch (err) { next(err) }
  }

  // GET /api/v1/pricing/rates
  getRateRange = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!
      const { hotelId, from, to } = req.query as Record<string, string>
      const rates = await this.getCurrentRateUC.executeRange(
        hotelId!,
        new Date(from!),
        new Date(to!),
        user.organizationId!,
      )
      res.json(successResponse(rates.map(r => r.toJSON()), user.correlationId))
    } catch (err) { next(err) }
  }

  // POST /api/v1/pricing/surge
  applySurge = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!
      const surge = await this.applySurgePricingUC.execute({
        ...req.body,
        organizationId: user.organizationId!,
        appliedById: user.userId,
        appliedByRole: user.primaryRole,
      })
      res.status(201).json(successResponse(surge, user.correlationId))
    } catch (err) { next(err) }
  }

  // DELETE /api/v1/pricing/surge
  removeSurge = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!
      const { hotelId, roomTypeId } = req.body
      await this.applySurgePricingUC.remove(
        hotelId,
        user.organizationId!,
        roomTypeId,
        user.userId,
        user.primaryRole,
      )
      res.status(204).send()
    } catch (err) { next(err) }
  }

  // POST /api/v1/pricing/ota-sync
  syncOta = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!
      const { hotelId, otaProviderId, fromDate, toDate } = req.body
      const result = await this.syncOtaRatesUC.execute({
        organizationId: user.organizationId!,
        hotelId,
        otaProviderId,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
      })
      res.json(successResponse(result, user.correlationId))
    } catch (err) { next(err) }
  }
}
