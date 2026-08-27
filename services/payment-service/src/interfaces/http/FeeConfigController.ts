import type { Request, Response, NextFunction } from 'express'
import { validate } from '@stayflexi/shared-validation'
import { successResponse, paginatedSuccess, buildPaginationMeta } from '@stayflexi/shared-types'
import { NotFoundError } from '@stayflexi/shared-errors'
import {
  createFeeConfigSchema,
  updateFeeConfigSchema,
  listFeeConfigsQuerySchema,
  type CreateFeeConfigDto,
  type UpdateFeeConfigDto,
  type ListFeeConfigsQuery,
} from '../../application/dtos/taxConfig.dto'
import type { CreateFeeConfig } from '../../application/use-cases/CreateFeeConfig'
import type { GetFeeConfig } from '../../application/use-cases/GetFeeConfig'
import type { UpdateFeeConfig } from '../../application/use-cases/UpdateFeeConfig'
import type { DeleteFeeConfig } from '../../application/use-cases/DeleteFeeConfig'
import type { ListFeeConfigs } from '../../application/use-cases/ListFeeConfigs'

export class FeeConfigController {
  constructor(
    private readonly createUC: CreateFeeConfig,
    private readonly getUC: GetFeeConfig,
    private readonly updateUC: UpdateFeeConfig,
    private readonly deleteUC: DeleteFeeConfig,
    private readonly listUC: ListFeeConfigs,
  ) {}

  private getAuth(req: Request) {
    const user = (
      req as Request & {
        user?: { userId: string; organizationId: string | null; correlationId: string }
      }
    ).user
    if (!user || !user.userId) throw new NotFoundError('Missing user or organization context')
    const orgId = user.organizationId
    if (!orgId) throw new NotFoundError('Missing organization context')
    const correlationId =
      (req.headers['x-correlation-id'] as string | undefined) ?? user.correlationId
    return { userId: user.userId, orgId, correlationId }
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const dto = validate(createFeeConfigSchema as any, req.body) as CreateFeeConfigDto
      const config = await this.createUC.execute({
        organizationId: orgId,
        hotelId: dto.hotelId ?? null,
        name: dto.name,
        description: dto.description ?? null,
        type: dto.type as any,
        rate: dto.rate,
        appliesTo: dto.appliesTo,
        isActive: dto.isActive,
      })
      res.status(201).json(successResponse(config.toJSON(), correlationId))
    } catch (err) {
      next(err)
    }
  }

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const id = req.params['id']
      if (!id) throw new NotFoundError('Missing id')
      const config = await this.getUC.execute(id, orgId)
      res.json(successResponse(config.toJSON(), correlationId))
    } catch (err) {
      next(err)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const id = req.params['id']
      if (!id) throw new NotFoundError('Missing id')
      const dto = validate(updateFeeConfigSchema as any, req.body) as UpdateFeeConfigDto
      const updateData: Record<string, unknown> = {}
      if (dto.name !== undefined) updateData['name'] = dto.name
      if (dto.description !== undefined) updateData['description'] = dto.description
      if (dto.type !== undefined) updateData['type'] = dto.type
      if (dto.rate !== undefined) updateData['rate'] = dto.rate
      if (dto.appliesTo !== undefined) updateData['appliesTo'] = dto.appliesTo
      if (dto.isActive !== undefined) updateData['isActive'] = dto.isActive
      const config = await this.updateUC.execute(id, updateData as any, orgId)
      res.json(successResponse(config.toJSON(), correlationId))
    } catch (err) {
      next(err)
    }
  }

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const id = req.params['id']
      if (!id) throw new NotFoundError('Missing id')
      await this.deleteUC.execute(id, orgId)
      res.json(successResponse({ deleted: true }, correlationId))
    } catch (err) {
      next(err)
    }
  }

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const rawQuery: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(req.query as Record<string, unknown>)) {
        rawQuery[k] = Array.isArray(v) ? v[0] : v
      }
      const query = validate(listFeeConfigsQuerySchema as any, rawQuery) as ListFeeConfigsQuery
      const result = await this.listUC.execute(orgId, {
        hotelId: query.hotelId ?? null,
        isActive: query.isActive ?? undefined,
        search: query.search,
        page: query.page,
        limit: query.limit,
      })
      const meta = buildPaginationMeta(result.meta.total, result.meta.page, result.meta.limit)
      res.json(
        paginatedSuccess(
          result.data.map((c) => c.toJSON()),
          meta,
          correlationId,
        ),
      )
    } catch (err) {
      next(err)
    }
  }
}
