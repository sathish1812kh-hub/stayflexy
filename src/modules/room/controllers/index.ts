// FILE: src/modules/room/controllers/index.ts
import { type NextRequest } from "next/server";
import {
  successResponse,
  createdResponse,
  paginatedResponse,
  noContentResponse,
} from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import {
  validateCreateRoomType,
  validateUpdateRoomType,
  validateRoomTypeFilter,
  validateUpdateRoomTypeStatus,
  validateCreateRoom,
  validateUpdateRoom,
  validateUpdateRoomStatus,
  validateUpdateHousekeepingStatus,
  validateRoomFilter,
} from "../validators";
import type { RoomTypeService } from "../services/RoomTypeService";
import type { RoomService } from "../services/RoomService";
import type { RoomTypeStatus, RoomOperationalStatus, HousekeepingStatus } from "../types";
import type { AuthContext } from "@modules/auth/middleware";

// ─── RoomTypeController ───────────────────────────────────────────────────────

export class RoomTypeController {
  constructor(private readonly roomTypeService: RoomTypeService) {}

  async create(req: NextRequest, ctx: AuthContext) {
    try {
      const orgId = ctx.user.organizationId;
      if (!orgId) return handleRouteError(new Error("No organization"));
      const body = await req.json() as unknown;
      const dto = validateCreateRoomType(body);
      const roomType = await this.roomTypeService.createRoomType(dto, orgId);
      return createdResponse(roomType);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async list(req: NextRequest, ctx: AuthContext) {
    try {
      const orgId = ctx.user.organizationId;
      if (!orgId) return handleRouteError(new Error("No organization"));
      const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
      const filter = validateRoomTypeFilter(searchParams);
      const pagination = { page: filter.page, limit: filter.limit };
      const result = await this.roomTypeService.findByHotel(filter.hotelId, orgId, pagination);
      return paginatedResponse(result.data, result.meta);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async getById(_req: NextRequest, _ctx: AuthContext, id: string) {
    try {
      const roomType = await this.roomTypeService.findById(id);
      if (!roomType) {
        const { errorResponse } = await import("@utils/apiResponse");
        return errorResponse("NOT_FOUND", "Room type not found", 404);
      }
      // Tenant isolation: verify org
      if (
        _ctx.user.role !== "SUPER_ADMIN" &&
        roomType.organizationId !== _ctx.user.organizationId
      ) {
        const { errorResponse } = await import("@utils/apiResponse");
        return errorResponse("NOT_FOUND", "Room type not found", 404);
      }
      return successResponse(roomType);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async update(req: NextRequest, ctx: AuthContext, id: string) {
    try {
      const orgId = ctx.user.organizationId;
      if (!orgId) return handleRouteError(new Error("No organization"));
      const body = await req.json() as unknown;
      const dto = validateUpdateRoomType(body);
      const updated = await this.roomTypeService.updateRoomType(id, dto, orgId);
      return successResponse(updated);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async delete(_req: NextRequest, ctx: AuthContext, id: string) {
    try {
      const orgId = ctx.user.organizationId;
      if (!orgId) return handleRouteError(new Error("No organization"));
      await this.roomTypeService.deleteRoomType(id, orgId);
      return noContentResponse();
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async updateStatus(req: NextRequest, ctx: AuthContext, id: string) {
    try {
      const orgId = ctx.user.organizationId;
      if (!orgId) return handleRouteError(new Error("No organization"));
      const body = await req.json() as unknown;
      const dto = validateUpdateRoomTypeStatus(body);
      const updated = await this.roomTypeService.updateStatus(id, dto.status as RoomTypeStatus, orgId);
      return successResponse(updated);
    } catch (error) {
      return handleRouteError(error);
    }
  }
}

// ─── RoomController ───────────────────────────────────────────────────────────

export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  async create(req: NextRequest, ctx: AuthContext) {
    try {
      const orgId = ctx.user.organizationId;
      if (!orgId) return handleRouteError(new Error("No organization"));
      const body = await req.json() as unknown;
      const dto = validateCreateRoom(body);
      const room = await this.roomService.createRoom(dto, orgId);
      return createdResponse(room);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async list(req: NextRequest, ctx: AuthContext) {
    try {
      const orgId = ctx.user.organizationId;
      if (!orgId) return handleRouteError(new Error("No organization"));
      const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
      const filter = validateRoomFilter(searchParams);
      const result = await this.roomService.listRooms(filter.hotelId, orgId, filter);
      return paginatedResponse(result.data, result.meta);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async getById(_req: NextRequest, ctx: AuthContext, id: string) {
    try {
      const room = await this.roomService.findById(id);
      if (!room) {
        const { errorResponse } = await import("@utils/apiResponse");
        return errorResponse("NOT_FOUND", "Room not found", 404);
      }
      // Tenant isolation
      if (
        ctx.user.role !== "SUPER_ADMIN" &&
        room.organizationId !== ctx.user.organizationId
      ) {
        const { errorResponse } = await import("@utils/apiResponse");
        return errorResponse("NOT_FOUND", "Room not found", 404);
      }
      return successResponse(room);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async update(req: NextRequest, ctx: AuthContext, id: string) {
    try {
      const orgId = ctx.user.organizationId;
      if (!orgId) return handleRouteError(new Error("No organization"));
      const body = await req.json() as unknown;
      const dto = validateUpdateRoom(body);
      const updated = await this.roomService.updateRoom(id, dto, orgId);
      return successResponse(updated);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async delete(_req: NextRequest, ctx: AuthContext, id: string) {
    try {
      const orgId = ctx.user.organizationId;
      if (!orgId) return handleRouteError(new Error("No organization"));
      await this.roomService.deleteRoom(id, orgId);
      return noContentResponse();
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async updateOperationalStatus(req: NextRequest, ctx: AuthContext, id: string) {
    try {
      const orgId = ctx.user.organizationId;
      if (!orgId) return handleRouteError(new Error("No organization"));
      const body = await req.json() as unknown;
      const dto = validateUpdateRoomStatus(body);
      const updated = await this.roomService.updateOperationalStatus(
        id,
        dto.operationalStatus as RoomOperationalStatus,
        orgId
      );
      return successResponse(updated);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async updateHousekeepingStatus(req: NextRequest, ctx: AuthContext, id: string) {
    try {
      const orgId = ctx.user.organizationId;
      if (!orgId) return handleRouteError(new Error("No organization"));
      const body = await req.json() as unknown;
      const dto = validateUpdateHousekeepingStatus(body);
      const updated = await this.roomService.updateHousekeepingStatus(
        id,
        dto.housekeepingStatus as HousekeepingStatus,
        orgId
      );
      return successResponse(updated);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async getRoomTypeCounts(_req: NextRequest, _ctx: AuthContext, hotelId: string, roomTypeId: string) {
    try {
      const counts = await this.roomService.getCountByRoomType(hotelId, roomTypeId);
      return successResponse(counts);
    } catch (error) {
      return handleRouteError(error);
    }
  }
}
