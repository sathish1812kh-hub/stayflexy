import { type NextRequest } from "next/server";
import { NotificationController } from "../controllers";
import type { NotificationService } from "../services/NotificationService";
import type { NotificationTemplateService } from "../services/NotificationTemplateService";

export function createNotificationRoutes(
  notificationService: NotificationService,
  templateService: NotificationTemplateService
) {
  const controller = new NotificationController(notificationService, templateService);

  return {
    "POST /notifications": (req: NextRequest) => controller.create(req),

    "POST /notifications/send-template": (req: NextRequest) =>
      controller.sendFromTemplate(req),

    "GET /notifications": (req: NextRequest) => controller.list(req),

    "GET /notifications/:id": (
      req: NextRequest,
      ctx: { params: { id: string } }
    ) => controller.getById(req, ctx),

    "POST /notifications/:id/process": (
      req: NextRequest,
      ctx: { params: { id: string } }
    ) => controller.process(req, ctx),

    "POST /notifications/retry-failed": (req: NextRequest) =>
      controller.retryFailed(req),

    "GET /notifications/templates": (req: NextRequest) =>
      controller.listTemplates(req),

    "POST /notifications/templates": (req: NextRequest) =>
      controller.createTemplate(req),

    "GET /notifications/templates/:id": (
      req: NextRequest,
      ctx: { params: { id: string } }
    ) => controller.getTemplate(req, ctx),

    "PATCH /notifications/templates/:id": (
      req: NextRequest,
      ctx: { params: { id: string } }
    ) => controller.updateTemplate(req, ctx),
  };
}
