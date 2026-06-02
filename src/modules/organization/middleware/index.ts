// FILE: src/modules/organization/middleware/index.ts
import type { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@modules/auth/middleware";
import { errorResponse } from "@utils/apiResponse";
import type { AuthContext } from "@modules/auth/middleware";
import type { AuthenticatedUser } from "@modules/auth/types";

export type { AuthContext };
export type { AuthenticatedUser };

export interface OrgContext extends AuthContext {
  organizationId: string;
}

export type OrgHandler<TParams = Record<string, never>> = (
  req: NextRequest,
  ctx: OrgContext,
  params?: TParams
) => Promise<NextResponse> | NextResponse;

export type OrgParamHandler<TParams extends { id: string } = { id: string }> = (
  req: NextRequest,
  ctx: OrgContext,
  params: TParams
) => Promise<NextResponse> | NextResponse;

/**
 * Validates x-organization-id header and ensures the authenticated user
 * belongs to that organization. SUPER_ADMIN bypasses the ownership check.
 *
 * Usage:
 *   export const GET = withOrgContext(async (req, { user, organizationId }) => {
 *     return successResponse({ organizationId });
 *   });
 */
export function withOrgContext<TParams = Record<string, never>>(
  handler: OrgHandler<TParams>
): (req: NextRequest, params?: TParams) => Promise<NextResponse> {
  return withAuth<TParams>(async (req, { user }, params) => {
    const orgId = req.headers.get("x-organization-id") ?? "";

    if (!orgId) {
      return errorResponse("BAD_REQUEST", "x-organization-id header required", 400);
    }

    if (user.role !== "SUPER_ADMIN" && user.organizationId !== orgId) {
      return errorResponse(
        "FORBIDDEN",
        "Access to this organization is not permitted",
        403
      );
    }

    return handler(req, { user, organizationId: orgId }, params);
  });
}

/**
 * Validates the :id URL param is accessible by the authenticated user.
 * For /organizations/:id style routes.
 *
 * Usage:
 *   export const GET = withOrgParam(async (req, { user, organizationId }, params) => {
 *     return successResponse({ id: params.id });
 *   });
 */
export function withOrgParam<TParams extends { id: string } = { id: string }>(
  handler: OrgParamHandler<TParams>
): (req: NextRequest, params: TParams) => Promise<NextResponse> {
  return withAuth<TParams>(async (req, { user }, params) => {
    const orgId = params?.id ?? "";

    if (user.role !== "SUPER_ADMIN" && user.organizationId !== orgId) {
      return errorResponse(
        "FORBIDDEN",
        "Access to this organization is not permitted",
        403
      );
    }

    return handler(req, { user, organizationId: orgId }, params as TParams);
  }) as (req: NextRequest, params: TParams) => Promise<NextResponse>;
}
