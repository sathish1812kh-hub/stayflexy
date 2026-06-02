import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

// GET /api/v1/revenue/occupancy?hotelId=&date=YYYY-MM-DD
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await import("@modules/revenue/validators");
    const dto = v.validateOccupancyQuery(Object.fromEntries(req.nextUrl.searchParams));
    const { revenueService } = await import("@modules/revenue/container");
    const result = await revenueService.getOccupancy(dto, user.organizationId ?? "");
    return successResponse(result);
  } catch (error) {
    return handleRouteError(error);
  }
});
