import { type NextRequest } from "next/server";
import { successResponse, paginatedResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

// GET /api/v1/notifications/templates?templateType=&isActive=&page=&limit=
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const v = await import("@modules/notification/validators");
    const filter = v.validateTemplateFilter(Object.fromEntries(req.nextUrl.searchParams));
    const { templateService } = await import("@modules/notification/container");
    const result = await templateService.listTemplates(filter);
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/notifications/templates
export const POST = withPermission("notification", "create", async (req: NextRequest) => {
  try {
    const body = await req.json() as unknown;
    const v = await import("@modules/notification/validators");
    const dto = v.validateCreateTemplate(body);
    const { templateService } = await import("@modules/notification/container");
    const template = await templateService.createTemplate(dto);
    return successResponse(template, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
