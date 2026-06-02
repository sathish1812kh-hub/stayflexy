import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

// GET /api/v1/intelligence/forecasting?hotelId=&forecastDays=30
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await import("@modules/revenue/validators");
    const dto = v.validateForecastQuery(Object.fromEntries(req.nextUrl.searchParams));
    const { revenueService } = await import("@modules/revenue/container");
    const forecast = await revenueService.getForecast(dto, user.organizationId ?? "");
    return successResponse(forecast);
  } catch (error) {
    return handleRouteError(error);
  }
});
