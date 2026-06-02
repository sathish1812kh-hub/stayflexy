import { type NextRequest } from "next/server";
import { successResponse, paginatedResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

// GET /api/v1/maintenance/tickets?hotelId=&ticketStatus=&severity=&page=&limit=
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await import("@modules/maintenance/validators");
    const filter = v.validateMaintenanceTicketFilter(Object.fromEntries(req.nextUrl.searchParams));
    const { maintenanceService } = await import("@modules/maintenance/container");
    const result = await maintenanceService.listTickets(filter, user.organizationId ?? "");
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/maintenance/tickets
export const POST = withPermission("maintenance", "create", async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as unknown;
    const v = await import("@modules/maintenance/validators");
    const dto = v.validateCreateMaintenanceTicket(body);
    const { maintenanceService } = await import("@modules/maintenance/container");
    const ticket = await maintenanceService.createTicket(dto, user.id, user.organizationId ?? "");
    return successResponse(ticket, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
