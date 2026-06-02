import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

// POST /api/v1/pricing/calculate
// Body: { hotelId, roomTypeId, date, baseRate? }
// Returns: calculated rate preview (does NOT persist)
export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as unknown;
    const v = await import("@modules/pricing/validators");
    const dto = v.validateCalculateRate(body);
    const { dynamicRateService } = await import("@modules/pricing/container");
    const result = await dynamicRateService.calculateRatePreview(dto, user.organizationId ?? "");
    return successResponse(result);
  } catch (error) {
    return handleRouteError(error);
  }
});
