// FILE: src/modules/booking/controllers/index.ts
import { type NextRequest } from "next/server";
import {
  successResponse,
  createdResponse,
  paginatedResponse,
} from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import {
  validateCreateBooking,
  validateUpdateBooking,
  validateBookingFilter,
  validateCancelBooking,
  validateAvailabilitySearch,
} from "../validators";
import type { BookingService } from "../services";
import type { CancellationReason } from "../types";

export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  async create(req: NextRequest, userId: string, orgId: string) {
    try {
      const body = await req.json() as unknown;
      const dto = validateCreateBooking(body);
      const booking = await this.bookingService.createBooking(
        {
          hotelId: dto.hotelId,
          organizationId: orgId,
          source: dto.source,
          currency: dto.currency,
          specialRequests: dto.specialRequests,
          internalNotes: dto.internalNotes,
          bookedById: userId,
          rooms: dto.rooms.map((r) => ({
            roomId: r.roomId,
            roomTypeId: r.roomTypeId,
            checkInDate: new Date(r.checkInDate),
            checkOutDate: new Date(r.checkOutDate),
            adultCount: r.adultCount,
            childCount: r.childCount,
            specialRequests: r.specialRequests,
          })),
          guests: dto.guests.map((g) => ({
            isPrimary: g.isPrimary,
            firstName: g.firstName,
            lastName: g.lastName,
            email: g.email,
            phone: g.phone,
            nationality: g.nationality,
            governmentIdType: g.governmentIdType,
            governmentIdNumber: g.governmentIdNumber,
            dateOfBirth: g.dateOfBirth ? new Date(g.dateOfBirth) : undefined,
          })),
        },
        userId
      );
      return createdResponse(booking);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async list(req: NextRequest, orgId: string) {
    try {
      const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
      const filter = validateBookingFilter(searchParams);
      const result = await this.bookingService.listBookings(orgId, filter);
      return paginatedResponse(result.data, result.meta);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async getById(id: string, orgId: string) {
    try {
      const booking = await this.bookingService.getBooking(id, orgId);
      return successResponse(booking);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async update(req: NextRequest, id: string, userId: string, orgId: string) {
    try {
      const body = await req.json() as unknown;
      const dto = validateUpdateBooking(body);
      const updated = await this.bookingService.updateBooking(id, dto, userId, orgId);
      return successResponse(updated);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async cancel(req: NextRequest, id: string, userId: string, orgId: string) {
    try {
      const body = await req.json() as unknown;
      const dto = validateCancelBooking(body);
      const cancelled = await this.bookingService.cancelBooking(
        id,
        dto.reason as CancellationReason,
        dto.note,
        userId,
        orgId
      );
      return successResponse(cancelled);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async checkIn(id: string, userId: string, orgId: string) {
    try {
      const updated = await this.bookingService.checkIn(id, userId, orgId);
      return successResponse(updated);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async checkOut(id: string, userId: string, orgId: string) {
    try {
      const updated = await this.bookingService.checkOut(id, userId, orgId);
      return successResponse(updated);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async markNoShow(id: string, userId: string, orgId: string) {
    try {
      const updated = await this.bookingService.markNoShow(id, userId, orgId);
      return successResponse(updated);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async searchAvailability(req: NextRequest, orgId: string) {
    try {
      const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
      const dto = validateAvailabilitySearch(searchParams);
      const result = await this.bookingService.searchAvailability(dto, orgId);
      return successResponse(result);
    } catch (error) {
      return handleRouteError(error);
    }
  }

}
