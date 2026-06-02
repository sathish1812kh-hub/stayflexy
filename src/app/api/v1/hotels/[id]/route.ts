import { type NextRequest } from "next/server";
import { successResponse, noContentResponse, errorResponse } from "@utils/apiResponse";
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

// GET /api/v1/hotels/:id
export const GET = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const svc = await getHotelService();
    const hotel = await svc.findById(id);
    if (!hotel) return errorResponse("NOT_FOUND", "Hotel not found", 404);
    // Enforce tenant isolation
    if (user.role !== "SUPER_ADMIN" && hotel.organizationId !== user.organizationId) {
      return errorResponse("NOT_FOUND", "Hotel not found", 404);
    }
    return successResponse(hotel);
  } catch (error) {
    return handleRouteError(error);
  }
});

// PATCH /api/v1/hotels/:id
export const PATCH = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const svc = await getHotelService();
    const hotel = await svc.findById(id);
    if (!hotel) return errorResponse("NOT_FOUND", "Hotel not found", 404);
    if (user.role !== "SUPER_ADMIN" && hotel.organizationId !== user.organizationId) {
      return errorResponse("FORBIDDEN", "Access to this hotel is not permitted", 403);
    }
    const body = await req.json() as unknown;
    const v = await getValidators();
    const dto = v.validateUpdateHotel(body);
    const updated = await svc.updateHotel(id, dto, user.organizationId ?? "");
    return successResponse(updated);
  } catch (error) {
    return handleRouteError(error);
  }
});

// DELETE /api/v1/hotels/:id
export const DELETE = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const svc = await getHotelService();
    const hotel = await svc.findById(id);
    if (!hotel) return errorResponse("NOT_FOUND", "Hotel not found", 404);
    if (user.role !== "SUPER_ADMIN" && hotel.organizationId !== user.organizationId) {
      return errorResponse("FORBIDDEN", "Access to this hotel is not permitted", 403);
    }
    await svc.deleteHotel(id, user.organizationId ?? "");
    return noContentResponse();
  } catch (error) {
    return handleRouteError(error);
  }
});
