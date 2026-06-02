// FILE: src/modules/organization/controllers/index.ts
import { type NextRequest } from "next/server";
import {
  successResponse,
  createdResponse,
  paginatedResponse,
  noContentResponse,
} from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import {
  validateCreateOrganization,
  validateUpdateOrganization,
  validateOrgFilter,
  validateInviteMember,
} from "../validators";
import type { OrganizationService } from "../services";
import type { AuditContext } from "@common/contracts/IAuditService";

function extractAuditContext(req: NextRequest): AuditContext {
  return {
    userId: req.headers.get("x-user-id") ?? "unknown",
    organizationId: req.headers.get("x-organization-id") ?? "unknown",
    ipAddress:
      req.headers.get("x-forwarded-for") ??
      req.headers.get("x-real-ip") ??
      "unknown",
    userAgent: req.headers.get("user-agent") ?? "unknown",
  };
}

export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  async create(req: NextRequest) {
    try {
      const body = (await req.json()) as unknown;
      const dto = validateCreateOrganization(body);
      const createdById = req.headers.get("x-user-id") ?? "";
      const auditContext = extractAuditContext(req);
      const org = await this.orgService.createOrganization(dto, createdById, auditContext);
      return createdResponse(org);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async list(req: NextRequest) {
    try {
      const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
      const filter = validateOrgFilter(searchParams);
      const result = await this.orgService.listOrganizations(filter);
      return paginatedResponse(result.data, result.meta);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async getById(_req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const org = await this.orgService.findById(params.id);
      if (!org) {
        return handleRouteError(
          new (
            await import("@errors/HttpError")
          ).NotFoundError("Organization not found")
        );
      }
      return successResponse(org);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async update(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const body = (await req.json()) as unknown;
      const dto = validateUpdateOrganization(body);
      const requesterId = req.headers.get("x-user-id") ?? "";
      const auditContext = extractAuditContext(req);
      const org = await this.orgService.updateOrganization(
        params.id,
        dto,
        requesterId,
        auditContext
      );
      return successResponse(org);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async delete(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const auditContext = extractAuditContext(req);
      await this.orgService.deleteOrganization(params.id, auditContext);
      return noContentResponse();
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async inviteMember(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const body = (await req.json()) as unknown;
      const dto = validateInviteMember(body);
      const auditContext = extractAuditContext(req);
      const member = await this.orgService.inviteMember(params.id, dto, auditContext);
      return createdResponse(member);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async removeMember(
    req: NextRequest,
    { params }: { params: { id: string; userId: string } }
  ) {
    try {
      const auditContext = extractAuditContext(req);
      await this.orgService.removeMember(params.id, params.userId, auditContext);
      return noContentResponse();
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async getMembers(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
      const page = Number(searchParams["page"] ?? 1);
      const limit = Number(searchParams["limit"] ?? 20);
      const paginationParams = {
        page: Math.max(1, page),
        limit: Math.min(100, Math.max(1, limit)),
      };
      const result = await this.orgService.getMembers(params.id, paginationParams);
      return paginatedResponse(result.data, result.meta);
    } catch (error) {
      return handleRouteError(error);
    }
  }
}
