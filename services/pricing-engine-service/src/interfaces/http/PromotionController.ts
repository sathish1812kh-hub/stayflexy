import type { Request, Response, NextFunction } from 'express'
import { validate } from '@stayflexi/shared-validation'
import { successResponse } from '@stayflexi/shared-types'
import { UnauthorizedError } from '@stayflexi/shared-errors'
import {
  createPromotionDtoSchema,
  updatePromotionDtoSchema,
  listPromotionsDtoSchema,
  redeemPromotionDtoSchema,
} from '../../application/dtos/promotion.dto'
import type { CreatePromotion } from '../../application/use-cases/CreatePromotion'
import type { UpdatePromotion } from '../../application/use-cases/UpdatePromotion'
import type { GetPromotion } from '../../application/use-cases/GetPromotion'
import type { ListPromotions } from '../../application/use-cases/ListPromotions'
import type { DeletePromotion } from '../../application/use-cases/DeletePromotion'
import type { RedeemPromotion } from '../../application/use-cases/RedeemPromotion'
import type { IPromotionRepository } from '../../domain/repositories/IPromotionRepository'

function getAuth(req: Request) {
  const userId = req.headers['x-user-id'] as string | undefined
  const orgId = req.headers['x-organization-id'] as string | undefined
  const correlationId = req.headers['x-correlation-id'] as string | undefined
  if (!userId) throw new UnauthorizedError('Authentication required')
  if (!orgId) throw new UnauthorizedError('Organization context required')
  return { userId, orgId, correlationId }
}

export class PromotionController {
  constructor(
    private readonly createPromotionUC: CreatePromotion,
    private readonly updatePromotionUC: UpdatePromotion,
    private readonly getPromotionUC: GetPromotion,
    private readonly listPromotionsUC: ListPromotions,
    private readonly deletePromotionUC: DeletePromotion,
    private readonly redeemPromotionUC: RedeemPromotion,
    private readonly promotionRepo: IPromotionRepository,
  ) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = getAuth(req)
      const dto = validate(
        createPromotionDtoSchema as unknown as import('zod').ZodTypeAny,
        req.body,
      ) as unknown as Parameters<CreatePromotion['execute']>[0]
      const promo = await this.createPromotionUC.execute(dto, orgId, userId)
      res.status(201).json({ ...successResponse(promo.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = getAuth(req)
      const id = req.params['id'] as string
      const dto = validate(
        updatePromotionDtoSchema as unknown as import('zod').ZodTypeAny,
        req.body,
      )
      const promo = await this.updatePromotionUC.execute(
        id,
        dto as Parameters<UpdatePromotion['execute']>[1],
        orgId,
      )
      res.json({ ...successResponse(promo.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = getAuth(req)
      const id = req.params['id'] as string
      const promo = await this.getPromotionUC.execute(id, orgId)
      res.json({ ...successResponse(promo.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = getAuth(req)
      const dto = validate(
        listPromotionsDtoSchema as unknown as import('zod').ZodSchema<unknown>,
        req.query as Record<string, string | undefined>,
      ) as unknown as {
        hotelId?: string
        isActive?: boolean
        discountType?: string
        search?: string
        page: number
        limit: number
      }
      const result = await this.listPromotionsUC.execute(orgId, dto)
      res.json({
        success: true,
        data: result.data.map((p) => p.toJSON()),
        meta: { ...result.meta, correlationId },
      })
    } catch (err) {
      next(err)
    }
  }

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId } = getAuth(req)
      const id = req.params['id'] as string
      await this.deletePromotionUC.execute(id, orgId)
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  }

  redeem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = getAuth(req)
      const dto = validate(redeemPromotionDtoSchema, req.body)
      const result = await this.redeemPromotionUC.execute({
        code: dto.code,
        organizationId: orgId,
        hotelId: dto.hotelId ?? null,
        bookingId: dto.bookingId ?? null,
        guestId: dto.guestId ?? null,
        baseAmount: dto.baseAmount ?? undefined,
        nights: dto.nights ?? undefined,
        redeemedById: userId,
      })
      res.json({
        ...successResponse(
          {
            promotion: result.promotion.toJSON(),
            redemption: result.redemption.toJSON(),
            discountApplied: result.discountApplied,
          },
          correlationId,
        ),
      })
    } catch (err) {
      next(err)
    }
  }

  listRedemptions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { correlationId } = getAuth(req)
      const id = req.params['id'] as string
      const redemptions = await this.promotionRepo.listRedemptions(id)
      res.json({
        ...successResponse(
          redemptions.map((r) => r.toJSON()),
          correlationId,
        ),
      })
    } catch (err) {
      next(err)
    }
  }
}
