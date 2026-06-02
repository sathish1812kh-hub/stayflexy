import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withPermission } from "@modules/auth/middleware";

// POST /api/v1/ota/sync/inventory
export const POST = withPermission("ota", "sync", async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as unknown;
    const v = await import("@modules/channel-manager/validators");
    const dto = v.validateTriggerSync({ ...(body as object), syncType: "INVENTORY_PUSH" });
    const { syncJobService } = await import("@modules/synchronization/container");
    const job = await syncJobService.createSyncJob(
      { hotelId: dto.hotelId, providerId: dto.providerId, syncType: "INVENTORY_PUSH", payload: dto.payload, maxRetries: dto.maxRetries },
      user.id,
      user.organizationId ?? ""
    );
    return successResponse(job, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
