import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withPermission } from "@modules/auth/middleware";

// POST /api/v1/compliance/export  { requestType, subjectUserId, notes }
export const POST = withPermission("compliance", "create", async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as unknown;
    const v = await import("@modules/compliance/validators");
    const dto = v.validateCreateComplianceRequest(body);
    const { complianceService } = await import("@modules/compliance/container");
    const request = await complianceService.createExportRequest(dto, user.id, user.organizationId ?? "");
    return successResponse(request, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
