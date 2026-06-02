import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

async function getHotelService() {
  const { hotelService } = await import("@modules/hotel/container");
  return hotelService;
}
async function getValidators() {
  return import("@modules/hotel/validators");
}

// GET /api/v1/hotels — list hotels for user's org
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    if (!user.organizationId && user.role !== "SUPER_ADMIN") {
      return successResponse({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } });
    }
    const v = await getValidators();
    const params = v.validateHotelFilter(Object.fromEntries(req.nextUrl.searchParams));
    const orgId = user.role === "SUPER_ADMIN"
      ? (req.headers.get("x-organization-id") ?? undefined)
      : (user.organizationId ?? undefined);
    const svc = await getHotelService();
    const result = await svc.listHotels(orgId, params);
    return successResponse(result);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/hotels — requires hotel:create permission
export const POST = withPermission("hotel", "create", async (req: NextRequest, { user }) => {
  try {
    if (!user.organizationId) {
      const { errorResponse } = await import("@utils/apiResponse");
      return errorResponse("BAD_REQUEST", "User must belong to an organization to create a hotel", 400);
    }
    const body = await req.json() as unknown;
    const v = await getValidators();
    const dto = v.validateCreateHotel(body);
    const svc = await getHotelService();
    const hotel = await svc.createHotel(dto, user.organizationId, user.id);
    return successResponse(hotel, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
