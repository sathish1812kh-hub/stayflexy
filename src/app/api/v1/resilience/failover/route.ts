import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withPermission } from "@modules/auth/middleware";

// POST /api/v1/resilience/failover  { recoveryType, backupSnapshotId?, metadata? }
export const POST = withPermission("disaster-recovery", "create", async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as unknown;
    const v = await import("@modules/disaster-recovery/validators");
    const dto = v.validateInitiateRecovery(body);
    const { disasterRecoveryService } = await import("@modules/disaster-recovery/container");
    const execution = await disasterRecoveryService.initiateRecovery(dto, user.id);
    return successResponse(execution, 202);
  } catch (error) {
    return handleRouteError(error);
  }
});
