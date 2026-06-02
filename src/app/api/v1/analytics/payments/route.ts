import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

// GET /api/v1/analytics/payments?hotelId=&startDate=&endDate=
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await import("@modules/analytics/validators");
    const dto = v.validateAnalyticsQuery(Object.fromEntries(req.nextUrl.searchParams));
    const { analyticsService } = await import("@modules/analytics/container");
    const result = await analyticsService.getPaymentAnalytics(dto, user.organizationId ?? "");
    return successResponse(result);
  } catch (error) {
    return handleRouteError(error);
  }
});
