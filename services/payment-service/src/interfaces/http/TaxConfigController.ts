import type { Request, Response, NextFunction } from 'express'
import { validate } from '@stayflexi/shared-validation'
import { successResponse, paginatedSuccess, buildPaginationMeta } from '@stayflexi/shared-types'
import { NotFoundError } from '@stayflexi/shared-errors'
import {
  createTaxConfigSchema,
  updateTaxConfigSchema,
  listTaxConfigsQuerySchema,
  type CreateTaxConfigDto,
  type UpdateTaxConfigDto,
  type ListTaxConfigsQuery,
} from '../../application/dtos/taxConfig.dto'
import type { CreateTaxConfig } from '../../application/use-cases/CreateTaxConfig'
import type { GetTaxConfig } from '../../application/use-cases/GetTaxConfig'
import type { UpdateTaxConfig } from '../../application/use-cases/UpdateTaxConfig'
import type { DeleteTaxConfig } from '../../application/use-cases/DeleteTaxConfig'
import type { ListTaxConfigs } from '../../application/use-cases/ListTaxConfigs'
import type { ITaxConfigRepository } from '../../domain/repositories/ITaxConfigRepository'
import type { TaxCalculationService } from '../../domain/services/TaxCalculationService'
import { z } from 'zod'

const calculateSchema = z.object({
  baseAmount: z.number().positive(),
  hotelId: z.string().uuid().nullable().optional(),
  nights: z.number().int().min(1).optional(),
  persons: z.number().int().min(1).optional(),
})

export class TaxConfigController {
  constructor(
    private readonly createUC: CreateTaxConfig,
    private readonly getUC: GetTaxConfig,
    private readonly updateUC: UpdateTaxConfig,
    private readonly deleteUC: DeleteTaxConfig,
    private readonly listUC: ListTaxConfigs,
    private readonly taxRepo: ITaxConfigRepository,
    private readonly calcService: TaxCalculationService,
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
      const dto = validate(createTaxConfigSchema as any, req.body) as CreateTaxConfigDto
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
      const dto = validate(updateTaxConfigSchema as any, req.body) as UpdateTaxConfigDto
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
      // Validate query — handle both string query params and already-parsed objects
      const rawQuery: Record<string, unknown> = {}
      // Express query may be string or string[]; normalize to string
      for (const [k, v] of Object.entries(req.query as Record<string, unknown>)) {
        rawQuery[k] = Array.isArray(v) ? v[0] : v
      }
      const query = validate(listTaxConfigsQuerySchema as any, rawQuery) as ListTaxConfigsQuery
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

  /** POST /api/v1/tax-configs/calculate — compute tax for a base amount using active configs */
  calculate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const dto = validate(calculateSchema as any, req.body) as z.infer<typeof calculateSchema>
      const configs = await this.taxRepo.findActive(orgId, dto.hotelId ?? null)
      const { total, breakdown } = this.calcService.calculateTax(dto.baseAmount, configs, {
        nights: dto.nights,
        persons: dto.persons,
      })
      res.json(
        successResponse(
          {
            baseAmount: dto.baseAmount,
            taxTotal: total,
            grandTotal: Math.round((dto.baseAmount + total) * 100) / 100,
            breakdown,
          },
          correlationId,
        ),
      )
    } catch (err) {
      next(err)
    }
  }
}
