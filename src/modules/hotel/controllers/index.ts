// FILE: src/modules/hotel/controllers/index.ts
import { type NextRequest } from "next/server";
import { successResponse, createdResponse, noContentResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { validateCreateHotel, validateUpdateHotel, validateHotelFilter, validateHotelStatus, validateHotelOperationalStatus, validateHotelSettings } from "../validators";
import type { HotelService } from "../services/HotelService";

export class HotelController {
  constructor(private readonly hotelService: HotelService) {}

  async create(req: NextRequest, orgId: string, userId: string) {
    try {
      const body = await req.json() as unknown;
      const dto = validateCreateHotel(body);
      const hotel = await this.hotelService.createHotel(dto, orgId, userId);
      return createdResponse(hotel);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async list(req: NextRequest, orgId?: string) {
    try {
      const params = validateHotelFilter(Object.fromEntries(req.nextUrl.searchParams));
      const result = await this.hotelService.listHotels(orgId, params);
      return successResponse(result);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async getById(req: NextRequest, id: string, orgId?: string) {
    try {
      const hotel = await this.hotelService.findById(id);
      if (!hotel) return handleRouteError(new (await import("@errors/HttpError")).NotFoundError("Hotel not found"));
      if (orgId && hotel.organizationId !== orgId) {
        return handleRouteError(new (await import("@errors/HttpError")).ForbiddenError("Access denied"));
      }
      return successResponse(hotel);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async update(req: NextRequest, id: string, orgId: string) {
    try {
      const body = await req.json() as unknown;
      const dto = validateUpdateHotel(body);
      const hotel = await this.hotelService.updateHotel(id, dto, orgId);
      return successResponse(hotel);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async delete(_req: NextRequest, id: string, orgId: string) {
    try {
      await this.hotelService.deleteHotel(id, orgId);
      return noContentResponse();
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async updateStatus(req: NextRequest, id: string, orgId: string) {
    try {
      const body = await req.json() as unknown;
      const dto = validateHotelStatus(body);
      const hotel = await this.hotelService.updateHotelStatus(id, dto.status, orgId);
      return successResponse(hotel);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async updateOperationalStatus(req: NextRequest, id: string, orgId: string) {
    try {
      const body = await req.json() as unknown;
      const dto = validateHotelOperationalStatus(body);
      const hotel = await this.hotelService.updateOperationalStatus(id, dto.operationalStatus, orgId);
      return successResponse(hotel);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async getSettings(_req: NextRequest, id: string, orgId?: string) {
    try {
      const settings = await this.hotelService.getHotelSettings(id, orgId);
      return successResponse(settings);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async updateSettings(req: NextRequest, id: string, orgId?: string) {
    try {
      const body = await req.json() as unknown;
      const dto = validateHotelSettings(body);
      const settings = await this.hotelService.updateHotelSettings(id, dto, orgId);
      return successResponse(settings);
    } catch (error) {
      return handleRouteError(error);
    }
  }
}
