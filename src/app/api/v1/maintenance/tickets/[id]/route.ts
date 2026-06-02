import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/maintenance/tickets/:id
export const GET = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const { maintenanceService } = await import("@modules/maintenance/container");
    const ticket = await maintenanceService.getTicket(id, user.organizationId ?? "");
    return successResponse(ticket);
  } catch (error) {
    return handleRouteError(error);
  }
});

// PATCH /api/v1/maintenance/tickets/:id
export const PATCH = withPermission("maintenance", "update", async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const body = await req.json() as unknown;
    const v = await import("@modules/maintenance/validators");

    const bodyObj = body as Record<string, unknown>;
    if ("ticketStatus" in bodyObj) {
      const dto = v.validateUpdateTicketStatus(body);
      const { maintenanceService } = await import("@modules/maintenance/container");
      const ticket = await maintenanceService.updateTicketStatus(id, dto, user.id, user.organizationId ?? "");
      return successResponse(ticket);
    }

    const dto = v.validateUpdateMaintenanceTicket(body);
    const { maintenanceService } = await import("@modules/maintenance/container");
    const ticket = await maintenanceService.updateTicket(id, dto, user.id, user.organizationId ?? "");
    return successResponse(ticket);
  } catch (error) {
    return handleRouteError(error);
  }
});
