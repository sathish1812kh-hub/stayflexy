import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";
import { prisma } from "@lib/prisma";

// GET /api/v1/auth/session-warning
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    // Check if there was any SESSION_HIJACK_ATTEMPT in the last 30 seconds for this user
    const warningEvent = await prisma.securityEvent.findFirst({
      where: {
        userId: user.id,
        eventType: "SESSION_HIJACK_ATTEMPT",
        detectedAt: {
          gt: new Date(Date.now() - 30 * 1000), // last 30 seconds
        },
      },
      orderBy: {
        detectedAt: "desc",
      },
    });

    if (warningEvent) {
      return successResponse({
        warning: true,
        message: "Security Alert: A 4th device attempted to log in using your credentials but was blocked. If this wasn't you, please change your password immediately.",
        timestamp: warningEvent.detectedAt,
      });
    }

    return successResponse({ warning: false });
  } catch (error) {
    return handleRouteError(error);
  }
});
