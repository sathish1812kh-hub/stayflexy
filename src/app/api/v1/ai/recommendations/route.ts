import { type NextRequest } from "next/server";
import { successResponse, paginatedResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

// GET /api/v1/ai/recommendations?hotelId=&recommendationType=&recommendationStatus=&page=&limit=
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await import("@modules/recommendations/validators");
    const filter = v.validateRecommendationFilter(Object.fromEntries(req.nextUrl.searchParams));
    const { recommendationService } = await import("@modules/recommendations/container");
    const result = await recommendationService.listRecommendations(filter, user.organizationId ?? "");
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/ai/recommendations — trigger recommendation generation
export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as unknown;
    const v = await import("@modules/recommendations/validators");
    const dto = v.validateGenerateRecommendations(body);
    const { recommendationService } = await import("@modules/recommendations/container");
    const results = await recommendationService.generateRecommendations(dto, user.organizationId ?? "");
    return successResponse(results, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
