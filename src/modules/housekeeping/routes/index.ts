// FILE: src/modules/housekeeping/routes/index.ts
import { type NextRequest } from "next/server";
import { HousekeepingController } from "../controllers";
import type { HousekeepingService } from "../services";

export function createHousekeepingRoutes(housekeepingService: HousekeepingService) {
  const controller = new HousekeepingController(housekeepingService);

  return {
    "POST /housekeeping/tasks": (req: NextRequest) => controller.create(req),

    "GET /housekeeping/tasks": (req: NextRequest) => controller.list(req),

    "GET /housekeeping/rooms/status": (req: NextRequest) =>
      controller.getRoomStatuses(req),

    "GET /housekeeping/tasks/:id": (
      req: NextRequest,
      ctx: { params: { id: string } }
    ) => controller.getById(req, ctx),

    "PATCH /housekeeping/tasks/:id": (
      req: NextRequest,
      ctx: { params: { id: string } }
    ) => controller.update(req, ctx),

    "PATCH /housekeeping/tasks/:id/assign": (
      req: NextRequest,
      ctx: { params: { id: string } }
    ) => controller.assign(req, ctx),

    "PATCH /housekeeping/tasks/:id/status": (
      req: NextRequest,
      ctx: { params: { id: string } }
    ) => controller.updateStatus(req, ctx),
  };
}
