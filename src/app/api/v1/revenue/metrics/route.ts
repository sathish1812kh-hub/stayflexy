import { type NextRequest } from "next/server";
import { successResponse, paginatedResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

// GET /api/v1/revenue/metrics?hotelId=&startDate=&endDate=&page=&limit=
// Returns stored RevenueMetric records for date range
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await import("@modules/revenue/validators");
    const filter = v.validateRevenueMetricFilter(Object.fromEntries(req.nextUrl.searchParams));
    const { revenueService } = await import("@modules/revenue/container");
    const result = await revenueService.getMetrics(filter, user.organizationId ?? "");
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/revenue/metrics
// Body: { hotelId, date } — triggers metric recalculation for the given date
export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as Record<string, unknown>;
    const hotelId = body["hotelId"] as string;
    const date = new Date((body["date"] as string) + "T00:00:00.000Z");
    const { revenueService } = await import("@modules/revenue/container");
    const metric = await revenueService.calculateDailyMetrics(hotelId, date, user.organizationId ?? "");
    return successResponse(metric, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
