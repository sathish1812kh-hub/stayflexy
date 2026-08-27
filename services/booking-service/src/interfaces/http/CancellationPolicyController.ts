import type { Request, Response, NextFunction } from 'express'
import { validate } from '@stayflexi/shared-validation'
import { NotFoundError } from '@stayflexi/shared-errors'
import { successResponse, paginatedSuccess, buildPaginationMeta } from '@stayflexi/shared-types'
import {
  createCancellationPolicySchema,
  updateCancellationPolicySchema,
  listCancellationPoliciesQuerySchema,
  type CreateCancellationPolicyDto,
  type UpdateCancellationPolicyDto,
  type ListCancellationPoliciesQuery,
} from '../../application/dtos/cancellationPolicy.dto'
import type { CreateCancellationPolicy } from '../../application/use-cases/CreateCancellationPolicy'
import type { GetCancellationPolicy } from '../../application/use-cases/GetCancellationPolicy'
import type { UpdateCancellationPolicy } from '../../application/use-cases/UpdateCancellationPolicy'
import type { DeleteCancellationPolicy } from '../../application/use-cases/DeleteCancellationPolicy'
import type { ListCancellationPolicies } from '../../application/use-cases/ListCancellationPolicies'
import type { FindApplicableCancellationPolicy } from '../../application/use-cases/FindApplicableCancellationPolicy'
import type { BookingConfig } from '../../config'

export class CancellationPolicyController {
  constructor(
    private readonly createPolicyUC: CreateCancellationPolicy,
    private readonly getPolicyUC: GetCancellationPolicy,
    private readonly updatePolicyUC: UpdateCancellationPolicy,
    private readonly deletePolicyUC: DeleteCancellationPolicy,
    private readonly listPoliciesUC: ListCancellationPolicies,
    private readonly findApplicableUC: FindApplicableCancellationPolicy,
    private readonly config: BookingConfig,
  ) {}

  private getAuth(req: Request) {
    const userId = req.headers['x-user-id'] as string | undefined
    const orgId = req.headers['x-organization-id'] as string | undefined
    const correlationId = req.headers['x-correlation-id'] as string | undefined
    if (!userId || !orgId) throw new NotFoundError('Missing user or organization context')
    return { userId, orgId, correlationId }
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const dto = validate(
        createCancellationPolicySchema as any,
        req.body,
      ) as CreateCancellationPolicyDto
      const policy = await this.createPolicyUC.execute({
        organizationId: orgId,
        hotelId: dto.hotelId ?? null,
        name: dto.name,
        description: dto.description ?? null,
        noticeHours: dto.noticeHours,
        penaltyPercent: dto.penaltyPercent,
        refundMethod: dto.refundMethod,
        nonRefundableAfter: dto.nonRefundableAfter ? new Date(dto.nonRefundableAfter) : null,
        isDefault: dto.isDefault,
        appliesToSources: dto.appliesToSources,
        appliesToRatePlans: dto.appliesToRatePlans,
      })
      res.status(201).json(successResponse(policy, correlationId))
    } catch (err) {
      next(err)
    }
  }

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const policy = await this.getPolicyUC.execute(req.params['id']!, orgId)
      res.json(successResponse(policy, correlationId))
    } catch (err) {
      next(err)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const dto = validate(
        updateCancellationPolicySchema as any,
        req.body,
      ) as UpdateCancellationPolicyDto
      const updateData: Record<string, unknown> = {}
      if (dto.name !== undefined) updateData['name'] = dto.name
      if (dto.description !== undefined) updateData['description'] = dto.description
      if (dto.noticeHours !== undefined) updateData['noticeHours'] = dto.noticeHours
      if (dto.penaltyPercent !== undefined) updateData['penaltyPercent'] = dto.penaltyPercent
      if (dto.refundMethod !== undefined) updateData['refundMethod'] = dto.refundMethod
      if (dto.nonRefundableAfter !== undefined)
        updateData['nonRefundableAfter'] = new Date(dto.nonRefundableAfter as string)
      if (dto.isDefault !== undefined) updateData['isDefault'] = dto.isDefault
      if (dto.appliesToSources !== undefined) updateData['appliesToSources'] = dto.appliesToSources
      if (dto.appliesToRatePlans !== undefined)
        updateData['appliesToRatePlans'] = dto.appliesToRatePlans
      const policy = await this.updatePolicyUC.execute(req.params['id']!, updateData as any, orgId)
      res.json(successResponse(policy, correlationId))
    } catch (err) {
      next(err)
    }
  }

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      await this.deletePolicyUC.execute(req.params['id']!, orgId)
      res.json(successResponse({ deleted: true }, correlationId))
    } catch (err) {
      next(err)
    }
  }

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const query = validate(
        listCancellationPoliciesQuerySchema as any,
        Object.fromEntries(new URLSearchParams(req.url.split('?')[1] || '')),
      ) as ListCancellationPoliciesQuery
      const result = await this.listPoliciesUC.execute(orgId, query)
      const meta = buildPaginationMeta(result.meta.total, result.meta.page, result.meta.limit)
      res.json(paginatedSuccess(result.data, meta, correlationId))
    } catch (err) {
      next(err)
    }
  }

  findApplicable = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const { hotelId, source, ratePlanId } = req.body as {
        hotelId: string
        source: string
        ratePlanId?: string
      }
      if (!hotelId || !source) {
        throw new NotFoundError('hotelId and source are required')
      }
      const policy = await this.findApplicableUC.execute(orgId, hotelId, source, ratePlanId)
      res.json(successResponse(policy, correlationId))
    } catch (err) {
      next(err)
    }
  }
}
