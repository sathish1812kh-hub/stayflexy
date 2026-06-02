// FILE: src/modules/audit/routes/index.ts
import { type NextRequest } from "next/server";
import { AuditController } from "../controllers";
import type { AuditService } from "../services";

export function createAuditRoutes(auditService: AuditService) {
  const controller = new AuditController(auditService);

  return {
    "GET /audit/logs": (req: NextRequest) => controller.list(req),

    "GET /audit/logs/resource/:resource/:resourceId": (
      req: NextRequest,
      ctx: { params: { resource: string; resourceId: string } }
    ) => controller.getByResource(req, ctx),

    "GET /audit/logs/user/:userId": (
      req: NextRequest,
      ctx: { params: { userId: string } }
    ) => controller.getByUser(req, ctx),
  };
}
