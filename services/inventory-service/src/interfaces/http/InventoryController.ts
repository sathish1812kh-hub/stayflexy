import type { Request, Response, NextFunction } from 'express'
import { validate } from '@stayflexi/shared-validation'
import { successResponse } from '@stayflexi/shared-types'
import { UnauthorizedError } from '@stayflexi/shared-errors'
import {
  reserveInventoryDtoSchema,
  releaseInventoryDtoSchema,
  blockInventoryDtoSchema,
  unblockInventoryDtoSchema,
  checkAvailabilityDtoSchema,
  getCalendarDtoSchema,
} from '../../application/dtos/inventory.dto'
import type { ReserveInventory } from '../../application/use-cases/ReserveInventory'
import type { ReleaseInventory } from '../../application/use-cases/ReleaseInventory'
import type { BlockInventory } from '../../application/use-cases/BlockInventory'
import type { UnblockInventory } from '../../application/use-cases/UnblockInventory'
import type { CheckAvailability } from '../../application/use-cases/CheckAvailability'
import type { GetAvailabilityCalendar } from '../../application/use-cases/GetAvailabilityCalendar'

interface AuthContext {
  userId: string
  orgId: string
  role: string
  correlationId: string | undefined
}

export class InventoryController {
  constructor(
    private readonly reserveUseCase: ReserveInventory,
    private readonly releaseUseCase: ReleaseInventory,
    private readonly blockUseCase: BlockInventory,
    private readonly unblockUseCase: UnblockInventory,
    private readonly checkAvailabilityUseCase: CheckAvailability,
    private readonly getCalendarUseCase: GetAvailabilityCalendar
  ) {}

  private getAuthContext(req: Request): AuthContext {
    const userId = req.headers['x-user-id'] as string | undefined
    const orgId = req.headers['x-organization-id'] as string | undefined
    const role = req.headers['x-user-role'] as string | undefined
    const correlationId = req.headers['x-correlation-id'] as string | undefined
    if (!userId) throw new UnauthorizedError('Authentication required')
    if (!orgId) throw new UnauthorizedError('Organization context required')
    return { userId, orgId, role: role ?? 'FRONT_DESK', correlationId }
  }

  reserve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuthContext(req)
      const dto = validate(reserveInventoryDtoSchema, req.body)
      const result = await this.reserveUseCase.execute(dto, orgId, correlationId)
      res.status(201).json({ ...successResponse(result, correlationId) })
    } catch (err) {
      next(err)
    }
  }

  release = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuthContext(req)
      const dto = validate(releaseInventoryDtoSchema, req.body)
      const result = await this.releaseUseCase.execute(dto, orgId, correlationId)
      res.json({ ...successResponse(result, correlationId) })
    } catch (err) {
      next(err)
    }
  }

  block = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = this.getAuthContext(req)
      const dto = validate(blockInventoryDtoSchema, req.body)
      const result = await this.blockUseCase.execute(dto, orgId, userId, correlationId)
      res.status(201).json({ ...successResponse(result, correlationId) })
    } catch (err) {
      next(err)
    }
  }

  unblock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuthContext(req)
      const dto = validate(unblockInventoryDtoSchema, req.body)
      const result = await this.unblockUseCase.execute(dto, orgId, correlationId)
      res.json({ ...successResponse(result, correlationId) })
    } catch (err) {
      next(err)
    }
  }

  checkAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { correlationId } = this.getAuthContext(req)
      const dto = validate(checkAvailabilityDtoSchema, req.query as Record<string, string | undefined>)
      const result = await this.checkAvailabilityUseCase.execute(dto)
      res.json({ ...successResponse(result, correlationId) })
    } catch (err) {
      next(err)
    }
  }

  getCalendar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { correlationId } = this.getAuthContext(req)
      const dto = validate(getCalendarDtoSchema, req.query as Record<string, string | undefined>)
      const result = await this.getCalendarUseCase.execute(dto)
      res.json({ ...successResponse(result, correlationId) })
    } catch (err) {
      next(err)
    }
  }
}
