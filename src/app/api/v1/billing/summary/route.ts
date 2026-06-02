import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

// GET /api/v1/billing/summary?hotelId=X&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await import("@modules/invoice/validators");
    const dto = v.validateBillingQuery(Object.fromEntries(req.nextUrl.searchParams));
    const { billingService } = await import("@modules/invoice/container");
    const summary = await billingService.getBillingSummary(dto, user.organizationId ?? "");
    return successResponse(summary);
  } catch (error) {
    return handleRouteError(error);
  }
});
