import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withPermission } from "@modules/auth/middleware";

// GET /api/v1/disaster-recovery/backups?backupType=&backupStatus=&page=&limit=
export const GET = withPermission("disaster-recovery", "read", async (req: NextRequest, _ctx) => {
  try {
    const v = await import("@modules/backup/validators");
    const dto = v.validateBackupFilter(Object.fromEntries(req.nextUrl.searchParams));
    const { backupService } = await import("@modules/backup/container");
    const result = await backupService.listSnapshots(dto);
    return successResponse(result);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/disaster-recovery/backups  { backupType, storageLocation, retentionUntil }
export const POST = withPermission("disaster-recovery", "create", async (req: NextRequest, _ctx) => {
  try {
    const body = await req.json() as unknown;
    const v = await import("@modules/backup/validators");
    const dto = v.validateCreateBackup(body);
    const { backupService } = await import("@modules/backup/container");
    const snapshot = await backupService.initiateBackup(dto);
    return successResponse(snapshot, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
