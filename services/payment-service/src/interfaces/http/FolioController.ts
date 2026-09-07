import type { Request, Response, NextFunction } from 'express'
import { validate } from '@stayflexi/shared-validation'
import { successResponse } from '@stayflexi/shared-types'
import { UnauthorizedError } from '@stayflexi/shared-errors'
import {
  createFolioDtoSchema,
  addFolioEntryDtoSchema,
  listFoliosDtoSchema,
} from '../../application/dtos/folio.dto'
import type { CreateFolio } from '../../application/use-cases/CreateFolio'
import type { AddFolioEntry } from '../../application/use-cases/AddFolioEntry'
import type { CloseFolio } from '../../application/use-cases/CloseFolio'
import type { ListFolios } from '../../application/use-cases/ListFolios'
import type { IFolioRepository } from '../../domain/repositories/IFolioRepository'

function getAuth(req: Request) {
  const userId = req.headers['x-user-id'] as string | undefined
  const orgId = req.headers['x-organization-id'] as string | undefined
  const correlationId = req.headers['x-correlation-id'] as string | undefined
  if (!userId) throw new UnauthorizedError('Authentication required')
  if (!orgId) throw new UnauthorizedError('Organization context required')
  return { userId, orgId, correlationId }
}

export class FolioController {
  constructor(
    private readonly createFolioUC: CreateFolio,
    private readonly addEntryUC: AddFolioEntry,
    private readonly closeFolioUC: CloseFolio,
    private readonly listFoliosUC: ListFolios,
    private readonly folioRepo: IFolioRepository,
  ) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = getAuth(req)
      const dto = validate(
        createFolioDtoSchema as unknown as import('zod').ZodTypeAny,
        req.body,
      ) as unknown as Parameters<CreateFolio['execute']>[0]
      const folio = await this.createFolioUC.execute(dto, orgId, userId)
      res.status(201).json({ ...successResponse(folio.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = getAuth(req)
      const id = req.params['id'] as string
      const folio = await this.folioRepo.findById(id)
      if (!folio || !folio.belongsToOrganization(orgId)) {
        const { NotFoundError } = await import('@stayflexi/shared-errors')
        throw new NotFoundError('Folio not found')
      }
      const entries = await this.folioRepo.listEntries(id)
      res.json({
        ...successResponse(
          { ...folio.toJSON(), entries: entries.map((e) => e.toJSON()) },
          correlationId,
        ),
      })
    } catch (err) {
      next(err)
    }
  }

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = getAuth(req)
      const dto = validate(
        listFoliosDtoSchema as unknown as import('zod').ZodSchema<unknown>,
        req.query as Record<string, string | undefined>,
      ) as unknown as {
        hotelId?: string
        bookingId?: string
        status?: string
        page: number
        limit: number
      }
      const result = await this.listFoliosUC.execute(orgId, dto)
      res.json({
        success: true,
        data: result.data.map((f) => f.toJSON()),
        meta: { ...result.meta, correlationId },
      })
    } catch (err) {
      next(err)
    }
  }

  addEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = getAuth(req)
      const id = req.params['id'] as string
      const dto = validate(
        addFolioEntryDtoSchema as unknown as import('zod').ZodTypeAny,
        req.body,
      ) as unknown as Parameters<AddFolioEntry['execute']>[1]
      const entry = await this.addEntryUC.execute(id, dto, orgId, userId)
      res.status(201).json({ ...successResponse(entry.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  listEntries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = getAuth(req)
      const id = req.params['id'] as string
      const folio = await this.folioRepo.findById(id)
      if (!folio || !folio.belongsToOrganization(orgId)) {
        const { NotFoundError } = await import('@stayflexi/shared-errors')
        throw new NotFoundError('Folio not found')
      }
      const entries = await this.folioRepo.listEntries(id)
      res.json({
        ...successResponse(
          entries.map((e) => e.toJSON()),
          correlationId,
        ),
      })
    } catch (err) {
      next(err)
    }
  }

  close = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = getAuth(req)
      const id = req.params['id'] as string
      const folio = await this.closeFolioUC.execute(id, orgId, userId)
      res.json({ ...successResponse(folio.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  void = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = getAuth(req)
      const id = req.params['id'] as string
      const folio = await this.folioRepo.findById(id)
      if (!folio || !folio.belongsToOrganization(orgId)) {
        const { NotFoundError } = await import('@stayflexi/shared-errors')
        throw new NotFoundError('Folio not found')
      }
      const voided = await this.folioRepo.void(id)
      res.json({ ...successResponse(voided.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }
}
