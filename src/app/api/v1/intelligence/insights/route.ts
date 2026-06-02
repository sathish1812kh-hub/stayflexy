import { type NextRequest } from "next/server";
import { successResponse, paginatedResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

// GET /api/v1/intelligence/insights?hotelId=&insightType=&severity=&page=&limit=
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await import("@modules/intelligence/validators");
    const filter = v.validateInsightFilter(Object.fromEntries(req.nextUrl.searchParams));
    const { intelligenceService } = await import("@modules/intelligence/container");
    const result = await intelligenceService.listInsights(filter, user.organizationId ?? "");
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/intelligence/insights — trigger insight generation for a hotel
export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as unknown;
    const v = await import("@modules/intelligence/validators");
    const dto = v.validateGenerateInsights(body);
    const { intelligenceService } = await import("@modules/intelligence/container");
    const insights = await intelligenceService.generateInsights(dto, user.organizationId ?? "");
    return successResponse(insights, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
