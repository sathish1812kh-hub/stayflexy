// FILE: src/modules/organization/routes/index.ts
import { type NextRequest } from "next/server";
import { OrganizationController } from "../controllers";
import type { OrganizationService } from "../services";

export function createOrganizationRoutes(orgService: OrganizationService) {
  const controller = new OrganizationController(orgService);

  return {
    "POST /organizations": (req: NextRequest) => controller.create(req),
    "GET /organizations": (req: NextRequest) => controller.list(req),
    "GET /organizations/:id": (req: NextRequest, ctx: { params: { id: string } }) =>
      controller.getById(req, ctx),
    "PATCH /organizations/:id": (req: NextRequest, ctx: { params: { id: string } }) =>
      controller.update(req, ctx),
    "DELETE /organizations/:id": (req: NextRequest, ctx: { params: { id: string } }) =>
      controller.delete(req, ctx),
    "POST /organizations/:id/members": (req: NextRequest, ctx: { params: { id: string } }) =>
      controller.inviteMember(req, ctx),
    "GET /organizations/:id/members": (req: NextRequest, ctx: { params: { id: string } }) =>
      controller.getMembers(req, ctx),
    "DELETE /organizations/:id/members/:userId": (
      req: NextRequest,
      ctx: { params: { id: string; userId: string } }
    ) => controller.removeMember(req, ctx),
  };
}
