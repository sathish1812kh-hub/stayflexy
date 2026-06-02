// FILE: src/modules/audit/controllers/index.ts
import { type NextRequest } from "next/server";
import {
  successResponse,
  paginatedResponse,
} from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { ForbiddenError } from "@errors/HttpError";
import { validateAuditFilter } from "../validators";
import type { AuditService } from "../services";

export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  async list(req: NextRequest) {
    try {
      const role = req.headers.get("x-user-role");
      if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
        throw new ForbiddenError("Only administrators may access audit logs");
      }

      const searchParams = Object.fromEntries(
        req.nextUrl.searchParams.entries()
      );
      const filter = validateAuditFilter(searchParams);

      const result = await this.auditService.listLogs({
        userId: filter.userId,
        organizationId: filter.organizationId,
        resource: filter.resource,
        action: filter.action,
        resourceId: filter.resourceId,
        success: filter.success,
        dateFrom: filter.dateFrom,
        dateTo: filter.dateTo,
        page: filter.page,
        limit: filter.limit,
      });

      return paginatedResponse(result.data, result.meta);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async getByResource(
    req: NextRequest,
    { params }: { params: { resource: string; resourceId: string } }
  ) {
    try {
      const role = req.headers.get("x-user-role");
      if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
        throw new ForbiddenError("Only administrators may access audit logs");
      }

      const searchParams = Object.fromEntries(
        req.nextUrl.searchParams.entries()
      );
      const filter = validateAuditFilter(searchParams);
      const paginationParams = {
        page: filter.page,
        limit: filter.limit,
      };

      const result = await this.auditService.findByResource(
        params.resource,
        params.resourceId,
        paginationParams
      );

      return paginatedResponse(result.data, result.meta);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async getByUser(
    req: NextRequest,
    { params }: { params: { userId: string } }
  ) {
    try {
      const role = req.headers.get("x-user-role");
      const requestingUserId = req.headers.get("x-user-id");

      // Admins can view any user's logs; regular users only their own
      if (
        role !== "ADMIN" &&
        role !== "SUPER_ADMIN" &&
        requestingUserId !== params.userId
      ) {
        throw new ForbiddenError(
          "You do not have permission to view this user's audit logs"
        );
      }

      const searchParams = Object.fromEntries(
        req.nextUrl.searchParams.entries()
      );
      const filter = validateAuditFilter(searchParams);
      const paginationParams = {
        page: filter.page,
        limit: filter.limit,
      };

      const result = await this.auditService.findByUser(
        params.userId,
        paginationParams
      );

      return successResponse(result);
    } catch (error) {
      return handleRouteError(error);
    }
  }
}
