import type { Request, Response, NextFunction } from 'express'
import { validate } from '@stayflexi/shared-validation'
import { successResponse, buildPaginationMeta } from '@stayflexi/shared-types'
import { UnauthorizedError } from '@stayflexi/shared-errors'
import {
  createHotelDtoSchema,
  updateHotelDtoSchema,
  listHotelsDtoSchema,
  createRoomTypeDtoSchema,
  updateRoomTypeDtoSchema,
  listRoomTypesDtoSchema,
  createRoomDtoSchema,
  updateRoomDtoSchema,
  updateRoomStatusDtoSchema,
  listRoomsDtoSchema,
} from '../../application/dtos/hotel.dto'
import type { CreateHotel } from '../../application/use-cases/CreateHotel'
import type { GetHotel } from '../../application/use-cases/GetHotel'
import type { UpdateHotel } from '../../application/use-cases/UpdateHotel'
import type { ListHotels } from '../../application/use-cases/ListHotels'
import type { CreateRoomType } from '../../application/use-cases/CreateRoomType'
import type { GetRoomType } from '../../application/use-cases/GetRoomType'
import type { UpdateRoomType } from '../../application/use-cases/UpdateRoomType'
import type { ListRoomTypes } from '../../application/use-cases/ListRoomTypes'
import type { CreateRoom } from '../../application/use-cases/CreateRoom'
import type { GetRoom } from '../../application/use-cases/GetRoom'
import type { UpdateRoom } from '../../application/use-cases/UpdateRoom'
import type { UpdateRoomStatus } from '../../application/use-cases/UpdateRoomStatus'
import type { ListRooms } from '../../application/use-cases/ListRooms'

interface AuthContext {
  userId: string
  orgId: string | null
  role: string
  correlationId: string | undefined
}

function requireOrgId(orgId: string | null): string {
  if (!orgId) throw new UnauthorizedError('Organization context required')
  return orgId
}

export class HotelController {
  constructor(
    private readonly createHotelUseCase: CreateHotel,
    private readonly getHotelUseCase: GetHotel,
    private readonly updateHotelUseCase: UpdateHotel,
    private readonly listHotelsUseCase: ListHotels,
    private readonly createRoomTypeUseCase: CreateRoomType,
    private readonly getRoomTypeUseCase: GetRoomType,
    private readonly updateRoomTypeUseCase: UpdateRoomType,
    private readonly listRoomTypesUseCase: ListRoomTypes,
    private readonly createRoomUseCase: CreateRoom,
    private readonly getRoomUseCase: GetRoom,
    private readonly updateRoomUseCase: UpdateRoom,
    private readonly updateRoomStatusUseCase: UpdateRoomStatus,
    private readonly listRoomsUseCase: ListRooms
  ) {}

  private getAuthContext(req: Request): AuthContext {
    const userId = req.headers['x-user-id'] as string | undefined
    const orgId = req.headers['x-organization-id'] as string | undefined
    const role = req.headers['x-user-role'] as string | undefined
    const correlationId = req.headers['x-correlation-id'] as string | undefined
    if (!userId) throw new UnauthorizedError('Authentication required')
    return {
      userId,
      orgId: orgId ?? null,
      role: role ?? 'FRONT_DESK',
      correlationId,
    }
  }

  // ─── Hotels ─────────────────────────────────────────────────────────────────

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = this.getAuthContext(req)
      const dto = validate(createHotelDtoSchema, req.body)
      const hotel = await this.createHotelUseCase.execute(dto, requireOrgId(orgId), userId, correlationId)
      res.status(201).json({ ...successResponse(hotel.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, role, correlationId } = this.getAuthContext(req)
      const id = req.params['id']
      if (!id) { next(new Error('Missing id param')); return }
      const hotel = await this.getHotelUseCase.execute(id, role === 'SUPER_ADMIN' ? null : orgId)
      res.json({ ...successResponse(hotel.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, role, correlationId } = this.getAuthContext(req)
      const id = req.params['id']
      if (!id) { next(new Error('Missing id param')); return }
      const dto = validate(updateHotelDtoSchema, req.body)
      const hotel = await this.updateHotelUseCase.execute(
        id, dto, userId, role === 'SUPER_ADMIN' ? null : orgId, correlationId
      )
      res.json({ ...successResponse(hotel.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, role, correlationId } = this.getAuthContext(req)
      const dto = validate(listHotelsDtoSchema, req.query as Record<string, string | undefined>)
      const result = await this.listHotelsUseCase.execute(dto, orgId, role)
      res.json({
        success: true,
        data: result.data.map((h) => h.toJSON()),
        meta: { ...result.meta, correlationId },
      })
    } catch (err) {
      next(err)
    }
  }

  // ─── Room Types ──────────────────────────────────────────────────────────────

  createRoomType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuthContext(req)
      const dto = validate(createRoomTypeDtoSchema, req.body)
      const roomType = await this.createRoomTypeUseCase.execute(dto, requireOrgId(orgId), correlationId)
      res.status(201).json({ ...successResponse(roomType.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  getRoomTypeById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuthContext(req)
      const id = req.params['id']
      if (!id) { next(new Error('Missing id param')); return }
      const roomType = await this.getRoomTypeUseCase.execute(id, requireOrgId(orgId))
      res.json({ ...successResponse(roomType.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  updateRoomType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuthContext(req)
      const id = req.params['id']
      if (!id) { next(new Error('Missing id param')); return }
      const dto = validate(updateRoomTypeDtoSchema, req.body)
      const roomType = await this.updateRoomTypeUseCase.execute(id, dto, requireOrgId(orgId), correlationId)
      res.json({ ...successResponse(roomType.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  listRoomTypes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuthContext(req)
      const hotelId = req.params['hotelId']
      if (!hotelId) { next(new Error('Missing hotelId param')); return }
      const dto = validate(listRoomTypesDtoSchema, req.query as Record<string, string | undefined>)
      const result = await this.listRoomTypesUseCase.execute(hotelId, dto, requireOrgId(orgId))
      res.json({
        success: true,
        data: result.data.map((rt) => rt.toJSON()),
        meta: { ...result.meta, correlationId },
      })
    } catch (err) {
      next(err)
    }
  }

  // ─── Rooms ───────────────────────────────────────────────────────────────────

  createRoom = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuthContext(req)
      const dto = validate(createRoomDtoSchema, req.body)
      const room = await this.createRoomUseCase.execute(dto, requireOrgId(orgId), correlationId)
      res.status(201).json({ ...successResponse(room.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  getRoomById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuthContext(req)
      const id = req.params['id']
      if (!id) { next(new Error('Missing id param')); return }
      const room = await this.getRoomUseCase.execute(id, requireOrgId(orgId))
      res.json({ ...successResponse(room.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  updateRoom = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuthContext(req)
      const id = req.params['id']
      if (!id) { next(new Error('Missing id param')); return }
      const dto = validate(updateRoomDtoSchema, req.body)
      const room = await this.updateRoomUseCase.execute(id, dto, requireOrgId(orgId), correlationId)
      res.json({ ...successResponse(room.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  updateRoomStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = this.getAuthContext(req)
      const id = req.params['id']
      if (!id) { next(new Error('Missing id param')); return }
      const dto = validate(updateRoomStatusDtoSchema, req.body)
      const room = await this.updateRoomStatusUseCase.execute(
        id, dto, userId, requireOrgId(orgId), correlationId
      )
      res.json({ ...successResponse(room.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  listRooms = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuthContext(req)
      const hotelId = req.params['hotelId']
      if (!hotelId) { next(new Error('Missing hotelId param')); return }
      const dto = validate(listRoomsDtoSchema, req.query as Record<string, string | undefined>)
      const result = await this.listRoomsUseCase.execute(hotelId, dto, requireOrgId(orgId))
      res.json({
        success: true,
        data: result.data.map((r) => r.toJSON()),
        meta: { ...result.meta, correlationId },
      })
    } catch (err) {
      next(err)
    }
  }
}
