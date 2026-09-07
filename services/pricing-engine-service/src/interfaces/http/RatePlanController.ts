import type { Request, Response, NextFunction } from 'express'
import { validate } from '@stayflexi/shared-validation'
import { successResponse } from '@stayflexi/shared-types'
import { UnauthorizedError } from '@stayflexi/shared-errors'
import {
  createRatePlanDtoSchema,
  updateRatePlanDtoSchema,
  listRatePlansDtoSchema,
  createSeasonDtoSchema,
  updateSeasonDtoSchema,
  createRestrictionDtoSchema,
  updateRestrictionDtoSchema,
} from '../../application/dtos/ratePlan.dto'
import type { CreateRatePlan } from '../../application/use-cases/CreateRatePlan'
import type { UpdateRatePlan } from '../../application/use-cases/UpdateRatePlan'
import type { GetRatePlan } from '../../application/use-cases/GetRatePlan'
import type { ListRatePlans } from '../../application/use-cases/ListRatePlans'
import type { DeleteRatePlan } from '../../application/use-cases/DeleteRatePlan'
import type { CreateSeason } from '../../application/use-cases/CreateSeason'
import type { ListSeasons } from '../../application/use-cases/ListSeasons'
import type { CreateRestriction } from '../../application/use-cases/CreateRestriction'
import type { ListRestrictions } from '../../application/use-cases/ListRestrictions'
import type { ISeasonRepository } from '../../domain/repositories/ISeasonRepository'
import type { IRestrictionRepository } from '../../domain/repositories/IRestrictionRepository'

function getAuth(req: Request) {
  const userId = req.headers['x-user-id'] as string | undefined
  const orgId = req.headers['x-organization-id'] as string | undefined
  const correlationId = req.headers['x-correlation-id'] as string | undefined
  if (!userId) throw new UnauthorizedError('Authentication required')
  if (!orgId) throw new UnauthorizedError('Organization context required')
  return { userId, orgId, correlationId }
}

export class RatePlanController {
  constructor(
    private readonly createRatePlanUC: CreateRatePlan,
    private readonly updateRatePlanUC: UpdateRatePlan,
    private readonly getRatePlanUC: GetRatePlan,
    private readonly listRatePlansUC: ListRatePlans,
    private readonly deleteRatePlanUC: DeleteRatePlan,
    private readonly createSeasonUC: CreateSeason,
    private readonly listSeasonsUC: ListSeasons,
    private readonly createRestrictionUC: CreateRestriction,
    private readonly listRestrictionsUC: ListRestrictions,
    private readonly seasonRepo: ISeasonRepository,
    private readonly restrictionRepo: IRestrictionRepository,
  ) {}

  // RatePlan CRUD

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = getAuth(req)
      const dto = validate(
        createRatePlanDtoSchema as unknown as import('zod').ZodTypeAny,
        req.body,
      ) as unknown as Parameters<CreateRatePlan['execute']>[0]
      const rp = await this.createRatePlanUC.execute(dto, orgId, userId)
      res.status(201).json({ ...successResponse(rp.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = getAuth(req)
      const id = req.params['id'] as string
      const dto = validate(updateRatePlanDtoSchema as unknown as import('zod').ZodTypeAny, req.body)
      const rp = await this.updateRatePlanUC.execute(
        id,
        dto as Parameters<UpdateRatePlan['execute']>[1],
        orgId,
      )
      res.json({ ...successResponse(rp.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = getAuth(req)
      const id = req.params['id'] as string
      const rp = await this.getRatePlanUC.execute(id, orgId)
      res.json({ ...successResponse(rp.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = getAuth(req)
      const dto = validate(
        listRatePlansDtoSchema as unknown as import('zod').ZodSchema<unknown>,
        req.query as Record<string, string | undefined>,
      ) as unknown as {
        hotelId?: string
        roomTypeId?: string
        isActive?: boolean
        search?: string
        page: number
        limit: number
      }
      const result = await this.listRatePlansUC.execute(orgId, dto)
      res.json({
        success: true,
        data: result.data.map((r) => r.toJSON()),
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
      await this.deleteRatePlanUC.execute(id, orgId)
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  }

  // Season

  createSeason = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = getAuth(req)
      const dto = validate(
        createSeasonDtoSchema as unknown as import('zod').ZodTypeAny,
        req.body,
      ) as unknown as Parameters<CreateSeason['execute']>[0]
      const season = await this.createSeasonUC.execute(dto, orgId)
      res.status(201).json({ ...successResponse(season.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  listSeasons = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = getAuth(req)
      const filter = {
        hotelId: req.query['hotelId'] as string | undefined,
        isActive: req.query['isActive'] ? req.query['isActive'] === 'true' : undefined,
        page: req.query['page'] ? Number(req.query['page']) : 1,
        limit: req.query['limit'] ? Number(req.query['limit']) : 20,
      }
      const result = await this.listSeasonsUC.execute(orgId, filter)
      res.json({
        success: true,
        data: result.data.map((s) => s.toJSON()),
        meta: { ...result.meta, correlationId },
      })
    } catch (err) {
      next(err)
    }
  }

  getSeasonById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { correlationId } = getAuth(req)
      const id = req.params['id'] as string
      const season = await this.seasonRepo.findById(id)
      if (!season || season.deletedAt) {
        const { NotFoundError } = await import('@stayflexi/shared-errors')
        throw new NotFoundError('Season not found')
      }
      res.json({ ...successResponse(season.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  updateSeason = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { correlationId } = getAuth(req)
      const id = req.params['id'] as string
      const dto = validate(updateSeasonDtoSchema as unknown as import('zod').ZodTypeAny, req.body)
      const season = await this.seasonRepo.update(
        id,
        dto as unknown as Parameters<ISeasonRepository['update']>[1],
      )
      res.json({ ...successResponse(season.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  deleteSeason = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      getAuth(req)
      const id = req.params['id'] as string
      await this.seasonRepo.softDelete(id)
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  }

  // Restriction

  createRestriction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = getAuth(req)
      const dto = validate(
        createRestrictionDtoSchema as unknown as import('zod').ZodTypeAny,
        req.body,
      ) as unknown as Parameters<CreateRestriction['execute']>[0]
      const restriction = await this.createRestrictionUC.execute(dto, orgId)
      res.status(201).json({ ...successResponse(restriction.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  listRestrictions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = getAuth(req)
      const filter = {
        hotelId: req.query['hotelId'] as string | undefined,
        ratePlanId: req.query['ratePlanId'] as string | undefined,
        roomTypeId: req.query['roomTypeId'] as string | undefined,
        page: req.query['page'] ? Number(req.query['page']) : 1,
        limit: req.query['limit'] ? Number(req.query['limit']) : 20,
      }
      const result = await this.listRestrictionsUC.execute(orgId, filter)
      res.json({
        success: true,
        data: result.data.map((r) => r.toJSON()),
        meta: { ...result.meta, correlationId },
      })
    } catch (err) {
      next(err)
    }
  }

  getRestrictionById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { correlationId } = getAuth(req)
      const id = req.params['id'] as string
      const r = await this.restrictionRepo.findById(id)
      if (!r) {
        const { NotFoundError } = await import('@stayflexi/shared-errors')
        throw new NotFoundError('Restriction not found')
      }
      res.json({ ...successResponse(r.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  updateRestriction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { correlationId } = getAuth(req)
      const id = req.params['id'] as string
      const dto = validate(updateRestrictionDtoSchema, req.body)
      const r = await this.restrictionRepo.update(
        id,
        dto as unknown as Parameters<IRestrictionRepository['update']>[1],
      )
      res.json({ ...successResponse(r.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  deleteRestriction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      getAuth(req)
      const id = req.params['id'] as string
      await this.restrictionRepo.delete(id)
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  }
}
