import type { Request, Response, NextFunction } from 'express'
import { validate } from '@stayflexi/shared-validation'
import { successResponse } from '@stayflexi/shared-types'
import { UnauthorizedError, NotFoundError } from '@stayflexi/shared-errors'
import {
  createNightAuditDtoSchema,
  listNightAuditsDtoSchema,
} from '../../application/dtos/folio.dto'
import type { RunNightAudit } from '../../application/use-cases/RunNightAudit'
import type { ListNightAudits } from '../../application/use-cases/ListNightAudits'
import type { INightAuditRepository } from '../../domain/repositories/INightAuditRepository'

function getAuth(req: Request) {
  const userId = req.headers['x-user-id'] as string | undefined
  const orgId = req.headers['x-organization-id'] as string | undefined
  const correlationId = req.headers['x-correlation-id'] as string | undefined
  if (!userId) throw new UnauthorizedError('Authentication required')
  if (!orgId) throw new UnauthorizedError('Organization context required')
  return { userId, orgId, correlationId }
}

export class NightAuditController {
  constructor(
    private readonly runAuditUC: RunNightAudit,
    private readonly listAuditsUC: ListNightAudits,
    private readonly auditRepo: INightAuditRepository,
  ) {}

  run = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = getAuth(req)
      const dto = validate(
        createNightAuditDtoSchema as unknown as import('zod').ZodTypeAny,
        req.body,
      ) as unknown as { hotelId: string; auditDate: Date }
      const audit = await this.runAuditUC.execute(dto.hotelId, dto.auditDate, orgId, userId)
      res.status(201).json({ ...successResponse(audit.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = getAuth(req)
      const filter = {
        hotelId: req.query['hotelId'] as string | undefined,
        status: req.query['status'] as string | undefined,
        page: req.query['page'] ? Number(req.query['page']) : 1,
        limit: req.query['limit'] ? Number(req.query['limit']) : 20,
      }
      const result = await this.listAuditsUC.execute(orgId, filter)
      res.json({
        success: true,
        data: result.data.map((a) => a.toJSON()),
        meta: { ...result.meta, correlationId },
      })
    } catch (err) {
      next(err)
    }
  }

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = getAuth(req)
      const id = req.params['id'] as string
      const audit = await this.auditRepo.findById(id)
      if (!audit || !audit.belongsToOrganization(orgId)) {
        throw new NotFoundError('Night audit not found')
      }
      res.json({ ...successResponse(audit.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }
}
