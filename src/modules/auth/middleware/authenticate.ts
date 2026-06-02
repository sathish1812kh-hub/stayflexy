import type { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { prisma } from "@lib/prisma";
import { errorResponse } from "@utils/apiResponse";
import { logger } from "@utils/logger";
import { verifyAccessToken } from "../utils/jwt";
import type { AuthenticatedUser } from "../types";

const log = logger.child("AuthMiddleware");

export interface AuthContext {
  user: AuthenticatedUser;
}

export type AuthHandler<TParams = Record<string, never>> = (
  req: NextRequest,
  ctx: AuthContext,
  params?: TParams
) => Promise<NextResponse> | NextResponse;

/**
 * Higher-order function that wraps a Next.js App Router handler with
 * JWT authentication. Extracts the Bearer token from the Authorization
 * header, verifies it, loads the user from DB, and passes an AuthContext
 * to the inner handler.
 *
 * Usage:
 *   export const GET = withAuth(async (req, { user }) => {
 *     return successResponse({ id: user.id });
 *   });
 */
export function withAuth<TParams = Record<string, never>>(
  handler: AuthHandler<TParams>
): (req: NextRequest, params?: any) => Promise<NextResponse> {
  return async (req: NextRequest, params?: any): Promise<NextResponse> => {
    try {
      const token = extractBearerToken(req);
      if (!token) {
        return errorResponse("UNAUTHORIZED", "Authentication required", 401);
      }

      const payload = verifyAccessToken(token);

      // If the payload has sid (Session ID), verify it is still valid in the database
      if (payload.sid) {
        const activeSession = await prisma.refreshToken.findFirst({
          where: {
            id: payload.sid,
            revokedAt: null,
            expiresAt: { gt: new Date() }
          }
        });
        
        if (!activeSession) {
          return errorResponse("UNAUTHORIZED", "Session has been terminated or force logged out", 401);
        }
      }

      // Load user from DB to ensure it still exists and is active
      const dbUser = await prisma.user.findFirst({
        where: { id: payload.sub, deletedAt: null },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          primaryRole: true,
          status: true,
          organizationId: true,
        },
      });

      if (!dbUser) {
        return errorResponse("UNAUTHORIZED", "Account not found", 401);
      }

      if (dbUser.status !== "ACTIVE") {
        return errorResponse("UNAUTHORIZED", "Account is not active", 401);
      }

      const user: AuthenticatedUser = {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        role: dbUser.primaryRole as AuthenticatedUser["role"],
        status: dbUser.status as AuthenticatedUser["status"],
        organizationId: dbUser.organizationId,
      };

      return await handler(req, { user }, params);
    } catch (error) {
      if (error instanceof Error && error.message.includes("expired")) {
        return errorResponse("UNAUTHORIZED", "Access token has expired", 401);
      }
      if (error instanceof Error && error.message.includes("Invalid")) {
        return errorResponse("UNAUTHORIZED", "Invalid access token", 401);
      }
      log.error("Authentication error", error instanceof Error ? error : undefined);
      return errorResponse("INTERNAL_SERVER_ERROR", "Authentication failed", 500);
    }
  };
}

export function extractBearerToken(req: NextRequest): string | null {
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  return token.length > 0 ? token : null;
}
