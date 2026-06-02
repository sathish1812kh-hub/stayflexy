import { type NextRequest } from "next/server";
import { successResponse, paginatedResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

// GET /api/v1/ai/anomalies?hotelId=&anomalyType=&minRiskScore=&page=&limit=
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await import("@modules/intelligence/validators");
    const filter = v.validateAnomalyFilter(Object.fromEntries(req.nextUrl.searchParams));
    const { intelligenceService } = await import("@modules/intelligence/container");
    const result = await intelligenceService.listAnomalies(filter, user.organizationId ?? "");
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/ai/anomalies — trigger anomaly detection for a hotel
export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as { hotelId: string };
    const { intelligenceService } = await import("@modules/intelligence/container");
    const results = await intelligenceService.detectAnomalies(body["hotelId"], user.organizationId ?? "");
    return successResponse(results, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
