// FILE: src/modules/room/routes/index.ts
import { type NextRequest } from "next/server";
import { RoomTypeController, RoomController } from "../controllers";
import type { RoomTypeService } from "../services/RoomTypeService";
import type { RoomService } from "../services/RoomService";
import type { AuthContext } from "@modules/auth/middleware";

export function createRoomTypeRoutes(roomTypeService: RoomTypeService) {
  const controller = new RoomTypeController(roomTypeService);

  return {
    "POST /room-types": (req: NextRequest, ctx: AuthContext) => controller.create(req, ctx),
    "GET /room-types": (req: NextRequest, ctx: AuthContext) => controller.list(req, ctx),
    "GET /room-types/:id": (req: NextRequest, ctx: AuthContext, id: string) =>
      controller.getById(req, ctx, id),
    "PATCH /room-types/:id": (req: NextRequest, ctx: AuthContext, id: string) =>
      controller.update(req, ctx, id),
    "DELETE /room-types/:id": (req: NextRequest, ctx: AuthContext, id: string) =>
      controller.delete(req, ctx, id),
    "PATCH /room-types/:id/status": (req: NextRequest, ctx: AuthContext, id: string) =>
      controller.updateStatus(req, ctx, id),
  };
}

export function createRoomRoutes(roomService: RoomService) {
  const controller = new RoomController(roomService);

  return {
    "POST /rooms": (req: NextRequest, ctx: AuthContext) => controller.create(req, ctx),
    "GET /rooms": (req: NextRequest, ctx: AuthContext) => controller.list(req, ctx),
    "GET /rooms/:id": (req: NextRequest, ctx: AuthContext, id: string) =>
      controller.getById(req, ctx, id),
    "PATCH /rooms/:id": (req: NextRequest, ctx: AuthContext, id: string) =>
      controller.update(req, ctx, id),
    "DELETE /rooms/:id": (req: NextRequest, ctx: AuthContext, id: string) =>
      controller.delete(req, ctx, id),
    "PATCH /rooms/:id/status": (req: NextRequest, ctx: AuthContext, id: string) =>
      controller.updateOperationalStatus(req, ctx, id),
    "PATCH /rooms/:id/housekeeping": (req: NextRequest, ctx: AuthContext, id: string) =>
      controller.updateHousekeepingStatus(req, ctx, id),
  };
}
