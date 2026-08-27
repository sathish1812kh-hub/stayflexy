import type { Request, Response, NextFunction } from 'express'
import { URL } from 'url'
import { validate } from '@stayflexi/shared-validation'
import { NotFoundError } from '@stayflexi/shared-errors'
import { successResponse, paginatedSuccess, buildPaginationMeta } from '@stayflexi/shared-types'
import {
  createGuestSchema,
  updateGuestSchema,
  listGuestsQuerySchema,
  type CreateGuestDto,
  type UpdateGuestDto,
  type ListGuestsQuery,
} from '../../application/dtos/guest.dto'
import type { CreateGuest } from '../../application/use-cases/CreateGuest'
import type { GetGuest } from '../../application/use-cases/GetGuest'
import type { UpdateGuest } from '../../application/use-cases/UpdateGuest'
import type { DeleteGuest } from '../../application/use-cases/DeleteGuest'
import type { ListGuests } from '../../application/use-cases/ListGuests'
import type { FindOrCreateGuestByEmail } from '../../application/use-cases/FindOrCreateGuestByEmail'
import type { OrgConfig } from '../../config'

export class GuestController {
  constructor(
    private readonly createGuestUC: CreateGuest,
    private readonly getGuestUC: GetGuest,
    private readonly updateGuestUC: UpdateGuest,
    private readonly deleteGuestUC: DeleteGuest,
    private readonly listGuestsUC: ListGuests,
    private readonly findOrCreateGuestByEmailUC: FindOrCreateGuestByEmail,
    private readonly config: OrgConfig,
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
      const dto = validate(createGuestSchema as any, req.body) as CreateGuestDto
      const guest = await this.createGuestUC.execute({
        organizationId: orgId,
        hotelId: dto.hotelId ?? null,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        nationality: dto.nationality ?? null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        governmentIdType: dto.governmentIdType ?? null,
        governmentIdNumber: dto.governmentIdNumber ?? null,
        preferences: dto.preferences ?? null,
        loyaltyTier: dto.loyaltyTier ?? null,
        loyaltyPoints: dto.loyaltyPoints ?? 0,
        metadata: dto.metadata ?? null,
      })
      res.status(201).json(successResponse(guest, correlationId))
    } catch (err) {
      next(err)
    }
  }

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const guest = await this.getGuestUC.execute(req.params['id']!, orgId)
      res.json(successResponse(guest, correlationId))
    } catch (err) {
      next(err)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const dto = validate(updateGuestSchema as any, req.body) as UpdateGuestDto
      const updateData: Record<string, unknown> = {}
      if (dto.hotelId !== undefined) updateData['hotelId'] = dto.hotelId
      if (dto.firstName !== undefined) updateData['firstName'] = dto.firstName
      if (dto.lastName !== undefined) updateData['lastName'] = dto.lastName
      if (dto.email !== undefined) updateData['email'] = dto.email
      if (dto.phone !== undefined) updateData['phone'] = dto.phone
      if (dto.nationality !== undefined) updateData['nationality'] = dto.nationality
      if (dto.dateOfBirth !== undefined)
        updateData['dateOfBirth'] = new Date(dto.dateOfBirth as string)
      if (dto.governmentIdType !== undefined) updateData['governmentIdType'] = dto.governmentIdType
      if (dto.governmentIdNumber !== undefined)
        updateData['governmentIdNumber'] = dto.governmentIdNumber
      if (dto.preferences !== undefined) updateData['preferences'] = dto.preferences
      if (dto.loyaltyTier !== undefined) updateData['loyaltyTier'] = dto.loyaltyTier
      if (dto.loyaltyPoints !== undefined) updateData['loyaltyPoints'] = dto.loyaltyPoints
      if (dto.metadata !== undefined) updateData['metadata'] = dto.metadata
      const guest = await this.updateGuestUC.execute(
        req.params['id']!,
        updateData as Parameters<UpdateGuest['execute']>[1],
        orgId,
      )
      res.json(successResponse(guest, correlationId))
    } catch (err) {
      next(err)
    }
  }

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      await this.deleteGuestUC.execute(req.params['id']!, orgId)
      res.json(successResponse({ deleted: true }, correlationId))
    } catch (err) {
      next(err)
    }
  }

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const query = validate(
        listGuestsQuerySchema as any,
        Object.fromEntries(new URLSearchParams(req.url.split('?')[1] || '')),
      ) as ListGuestsQuery
      const result = await this.listGuestsUC.execute(orgId, query)
      const meta = buildPaginationMeta(result.meta.total, result.meta.page, result.meta.limit)
      res.json(paginatedSuccess(result.data, meta, correlationId))
    } catch (err) {
      next(err)
    }
  }

  findOrCreateByEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const {
        email,
        firstName,
        lastName,
        hotelId,
        phone,
        nationality,
        dateOfBirth,
        governmentIdType,
        governmentIdNumber,
      } = req.body as {
        email: string
        firstName: string
        lastName: string
        hotelId?: string
        phone?: string
        nationality?: string
        dateOfBirth?: string
        governmentIdType?: string
        governmentIdNumber?: string
      }
      if (!email || !firstName || !lastName) {
        throw new NotFoundError('email, firstName, and lastName are required')
      }
      const guest = await this.findOrCreateGuestByEmailUC.execute({
        organizationId: orgId,
        hotelId: hotelId ?? null,
        email,
        firstName,
        lastName,
        phone: phone ?? null,
        nationality: nationality ?? null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        governmentIdType: governmentIdType as any,
        governmentIdNumber: governmentIdNumber ?? null,
      })
      res.status(201).json(successResponse(guest, correlationId))
    } catch (err) {
      next(err)
    }
  }
}
