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

// PATCH /api/v1/hotels/:id/status
export const PATCH = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    if (user.role !== "SUPER_ADMIN" && !user.organizationId) {
      return errorResponse("FORBIDDEN", "No organization context", 403);
    }
    const body = await req.json() as unknown;
    const v = await getValidators();
    const dto = v.validateHotelStatus(body);
    const orgId = user.role === "SUPER_ADMIN" ? undefined : (user.organizationId ?? "");
    const svc = await getHotelService();

    // Distinguish HotelStatus vs HotelOperationalStatus update by which key is present
    const bodyObj = body as Record<string, unknown>;
    if ("operationalStatus" in bodyObj) {
      const opDto = v.validateHotelOperationalStatus(body);
      const updated = await svc.updateOperationalStatus(id, opDto.operationalStatus, orgId);
      return successResponse(updated);
    }

    const updated = await svc.updateHotelStatus(id, dto.status, orgId);
    return successResponse(updated);
  } catch (error) {
    return handleRouteError(error);
  }
});
