import type { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { errorResponse } from "@utils/apiResponse";
import { logger } from "@utils/logger";
import { withAuth, type AuthContext, type AuthHandler } from "./authenticate";
import { RBACService } from "../services/RBACService";
import type { AuthenticatedUser } from "../types";

const log = logger.child("AuthorizeMiddleware");
const rbacService = new RBACService();

export interface AuthzContext extends AuthContext {
  permissionKeys: string[];
}

export type AuthzHandler<TParams = Record<string, never>> = (
  req: NextRequest,
  ctx: AuthzContext,
  params?: TParams
) => Promise<NextResponse> | NextResponse;

/**
 * Wraps a handler with role-based access control.
 * The user must have at least one of the allowed roles (by primaryRole).
 *
 * Usage:
 *   export const GET = withRoles(["ORG_ADMIN", "HOTEL_MANAGER"], handler);
 */
export function withRoles<TParams = Record<string, never>>(
  allowedRoles: AuthenticatedUser["role"][],
  handler: AuthHandler<TParams>
): (req: NextRequest, params?: any) => Promise<NextResponse> {
  return withAuth<TParams>(async (req, ctx, params) => {
    if (!allowedRoles.includes(ctx.user.role)) {
      log.warn("Role access denied", {
        userId: ctx.user.id,
        userRole: ctx.user.role,
        requiredRoles: allowedRoles,
      });
      return errorResponse("FORBIDDEN", "You do not have the required role for this action", 403);
    }
    return handler(req, ctx, params);
  });
}

/**
 * Wraps a handler with permission-based access control.
 * Queries the user's effective permissions via RBACService.
 *
 * Usage:
 *   export const POST = withPermission("hotel", "create", handler);
 */
export function withPermission<TParams = Record<string, never>>(
  resource: string,
  action: string,
  handler: AuthzHandler<TParams>
): (req: NextRequest, params?: any) => Promise<NextResponse> {
  return withAuth<TParams>(async (req, ctx, params) => {
    try {
      const scope = { organizationId: ctx.user.organizationId };
      const { permissionKeys } = await rbacService.getUserPermissions(ctx.user.id, scope);
      const required = `${resource}:${action}`;

      if (!permissionKeys.includes(required)) {
        log.warn("Permission denied", {
          userId: ctx.user.id,
          required,
          available: permissionKeys,
        });
        return errorResponse(
          "FORBIDDEN",
          `You do not have permission to perform "${action}" on "${resource}"`,
          403
        );
      }

      return handler(req, { ...ctx, permissionKeys }, params);
    } catch (error) {
      log.error("Permission check error", error instanceof Error ? error : undefined);
      return errorResponse("INTERNAL_SERVER_ERROR", "Authorization check failed", 500);
    }
  });
}

/**
 * Wraps a handler ensuring the request user is the SUPER_ADMIN.
 */
export function withSuperAdmin<TParams = Record<string, never>>(
  handler: AuthHandler<TParams>
): (req: NextRequest, params?: any) => Promise<NextResponse> {
  return withRoles<TParams>(["SUPER_ADMIN"], handler);
}

/**
 * Ensures the authenticated user belongs to the organization specified
 * in the x-organization-id header, or is a SUPER_ADMIN.
 */
export function withOrgAccess<TParams = Record<string, never>>(
  handler: AuthHandler<TParams>
): (req: NextRequest, params?: any) => Promise<NextResponse> {
  return withAuth<TParams>(async (req, ctx, params) => {
    const headerOrgId = req.headers.get("x-organization-id");

    if (ctx.user.role === "SUPER_ADMIN") {
      return handler(req, ctx, params);
    }

    if (!headerOrgId || ctx.user.organizationId !== headerOrgId) {
      return errorResponse("FORBIDDEN", "Access to this organization is not permitted", 403);
    }

    return handler(req, ctx, params);
  });
}
