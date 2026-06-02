import type { Request, Response, NextFunction } from 'express'
import { validate } from '@stayflexi/shared-validation'
import { UnauthorizedError } from '@stayflexi/shared-errors'
import { successResponse, paginatedSuccess } from '@stayflexi/shared-types'
import {
  createBookingSchema, patchBookingSchema, cancelBookingSchema, searchBookingSchema,
} from '../../application/dtos/booking.dto'
import type { CreateBooking } from '../../application/use-cases/CreateBooking'
import type { GetBooking } from '../../application/use-cases/GetBooking'
import type { CancelBooking } from '../../application/use-cases/CancelBooking'
import type { CheckIn } from '../../application/use-cases/CheckIn'
import type { CheckOut } from '../../application/use-cases/CheckOut'
import type { SearchBookings } from '../../application/use-cases/SearchBookings'
import type { PatchBooking } from '../../application/use-cases/PatchBooking'
import type { BookingConfig } from '../../config'
import type { FullBooking } from '../../domain/repositories/IBookingRepository'

function serializeFullBooking(fb: FullBooking) {
  return {
    ...fb.booking.toJSON(),
    rooms: fb.rooms.map(r => r.toJSON()),
    guests: fb.guests.map(g => g.toJSON()),
  }
}

export class BookingController {
  constructor(
    private readonly createBookingUC: CreateBooking,
    private readonly getBookingUC: GetBooking,
    private readonly cancelBookingUC: CancelBooking,
    private readonly checkInUC: CheckIn,
    private readonly checkOutUC: CheckOut,
    private readonly searchBookingsUC: SearchBookings,
    private readonly patchBookingUC: PatchBooking,
    private readonly config: BookingConfig
  ) {}

  private getAuth(req: Request) {
    const userId = req.headers['x-user-id'] as string | undefined
    const orgId = req.headers['x-organization-id'] as string | undefined
    const correlationId = req.headers['x-correlation-id'] as string | undefined
    if (!userId) throw new UnauthorizedError('Authentication required')
    if (!orgId) throw new UnauthorizedError('Organization context required')
    return { userId, orgId, correlationId }
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = this.getAuth(req)
      const dto = validate(createBookingSchema, req.body)
      const result = await this.createBookingUC.execute(dto, {
        organizationId: orgId, userId, correlationId,
        maxAdvanceBookingDays: this.config.MAX_ADVANCE_BOOKING_DAYS,
        maxRoomsPerBooking: this.config.MAX_ROOMS_PER_BOOKING,
      })
      res.status(201).json({ ...successResponse(serializeFullBooking(result), correlationId) })
    } catch (err) { next(err) }
  }

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const { id } = req.params
      if (!id) throw new Error('Missing id')
      const result = await this.getBookingUC.execute(id, orgId)
      res.json({ ...successResponse(serializeFullBooking(result), correlationId) })
    } catch (err) { next(err) }
  }

  patch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = this.getAuth(req)
      const { id } = req.params
      if (!id) throw new Error('Missing id')
      const dto = validate(patchBookingSchema, req.body)
      const booking = await this.patchBookingUC.execute(id, dto, userId, orgId, correlationId)
      res.json({ ...successResponse(booking.toJSON(), correlationId) })
    } catch (err) { next(err) }
  }

  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = this.getAuth(req)
      const { id } = req.params
      if (!id) throw new Error('Missing id')
      const dto = validate(cancelBookingSchema, req.body)
      const result = await this.cancelBookingUC.execute(id, dto, userId, orgId, correlationId)
      res.json({ ...successResponse(serializeFullBooking(result), correlationId) })
    } catch (err) { next(err) }
  }

  checkIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = this.getAuth(req)
      const { id } = req.params
      if (!id) throw new Error('Missing id')
      const result = await this.checkInUC.execute(id, userId, orgId, correlationId)
      res.json({ ...successResponse(serializeFullBooking(result), correlationId) })
    } catch (err) { next(err) }
  }

  checkOut = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = this.getAuth(req)
      const { id } = req.params
      if (!id) throw new Error('Missing id')
      const result = await this.checkOutUC.execute(id, userId, orgId, correlationId)
      res.json({ ...successResponse(serializeFullBooking(result), correlationId) })
    } catch (err) { next(err) }
  }

  search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const dto = validate(searchBookingSchema, req.query as Record<string, string>)
      const result = await this.searchBookingsUC.execute(dto, orgId)
      res.json({
        success: true, data: result.data.map(serializeFullBooking), meta: result.meta, correlationId,
      })
    } catch (err) { next(err) }
  }

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const dto = validate(searchBookingSchema, req.query as Record<string, string>)
      const result = await this.searchBookingsUC.execute(dto, orgId)
      res.json({
        success: true, data: result.data.map(serializeFullBooking), meta: result.meta, correlationId,
      })
    } catch (err) { next(err) }
  }
}
