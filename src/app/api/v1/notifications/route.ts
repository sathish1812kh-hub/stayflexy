import { type NextRequest } from "next/server";
import { successResponse, paginatedResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

// GET /api/v1/notifications?organizationId=&notificationType=&deliveryStatus=&page=&limit=
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await import("@modules/notification/validators");
    const filter = v.validateNotificationFilter(Object.fromEntries(req.nextUrl.searchParams));
    const { notificationService } = await import("@modules/notification/container");
    const result = await notificationService.listNotifications(
      { ...filter, organizationId: user.organizationId ?? "" },
      user.organizationId ?? ""
    );
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/notifications
export const POST = withPermission("notification", "create", async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as unknown;
    const v = await import("@modules/notification/validators");
    const dto = v.validateCreateNotification(body);
    const { notificationService } = await import("@modules/notification/container");
    const notification = await notificationService.createNotification(dto, user.organizationId ?? "");
    return successResponse(notification, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
