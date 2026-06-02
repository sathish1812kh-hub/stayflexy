import { type NextRequest } from "next/server";
import { successResponse, errorResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

async function getHotelService() {
  const { hotelService } = await import("@modules/hotel/container");
  return hotelService;
}
async function getValidators() {
  return import("@modules/hotel/validators");
}

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/hotels/:id/settings
export const GET = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const orgId = user.role === "SUPER_ADMIN" ? undefined : (user.organizationId ?? "");
    const svc = await getHotelService();
    const settings = await svc.getHotelSettings(id, orgId);
    return successResponse(settings);
  } catch (error) {
    return handleRouteError(error);
  }
});

// PATCH /api/v1/hotels/:id/settings
export const PATCH = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    if (user.role !== "SUPER_ADMIN" && !user.organizationId) {
      return errorResponse("FORBIDDEN", "No organization context", 403);
    }
    const orgId = user.role === "SUPER_ADMIN" ? undefined : (user.organizationId ?? "");
    const body = await req.json() as unknown;
    const v = await getValidators();
    const dto = v.validateHotelSettings(body);
    const svc = await getHotelService();
    const updated = await svc.updateHotelSettings(id, dto, orgId);
    return successResponse(updated);
  } catch (error) {
    return handleRouteError(error);
  }
});
