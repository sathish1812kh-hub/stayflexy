import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withPermission } from "@modules/auth/middleware";

type Params = { params: Promise<{ id: string }> };

// POST /api/v1/maintenance/tickets/:id/resolve
export const POST = withPermission("maintenance", "update", async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const body = await req.json() as unknown;
    const v = await import("@modules/maintenance/validators");
    const dto = v.validateResolveTicket(body);
    const { maintenanceService } = await import("@modules/maintenance/container");
    const ticket = await maintenanceService.resolveTicket(id, dto, user.id, user.organizationId ?? "");
    return successResponse(ticket);
  } catch (error) {
    return handleRouteError(error);
  }
});
