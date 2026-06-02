import { type NextRequest } from "next/server";
import {
  successResponse,
  createdResponse,
  paginatedResponse,
} from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { BadRequestError } from "@errors/HttpError";
import {
  validateCreateNotification,
  validateSendNotification,
  validateNotificationFilter,
  validateCreateTemplate,
  validateUpdateTemplate,
  validateTemplateFilter,
} from "../validators";
import type { NotificationService } from "../services/NotificationService";
import type { NotificationTemplateService } from "../services/NotificationTemplateService";

export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly templateService: NotificationTemplateService
  ) {}

  async create(req: NextRequest) {
    try {
      const orgId = req.headers.get("x-org-id");
      if (!orgId) throw new BadRequestError("Missing x-org-id header");
      const body = (await req.json()) as unknown;
      const dto = validateCreateNotification(body);
      const notification = await this.notificationService.createNotification(dto, orgId);
      return createdResponse(notification);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async sendFromTemplate(req: NextRequest) {
    try {
      const orgId = req.headers.get("x-org-id");
      if (!orgId) throw new BadRequestError("Missing x-org-id header");
      const body = (await req.json()) as unknown;
      const dto = validateSendNotification(body);
      const notification = await this.notificationService.sendFromTemplate(dto, orgId);
      return createdResponse(notification);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async list(req: NextRequest) {
    try {
      const orgId = req.headers.get("x-org-id");
      if (!orgId) throw new BadRequestError("Missing x-org-id header");
      const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
      const filter = validateNotificationFilter(searchParams);
      const result = await this.notificationService.listNotifications(filter, orgId);
      return paginatedResponse(result.data, result.meta);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async getById(
    _req: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const notification = await this.notificationService.getNotification(params.id);
      return successResponse(notification);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async process(
    _req: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const notification = await this.notificationService.processNotification(params.id);
      return successResponse(notification);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async retryFailed(_req: NextRequest) {
    try {
      const result = await this.notificationService.retryFailed();
      return successResponse(result);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async createTemplate(req: NextRequest) {
    try {
      const body = (await req.json()) as unknown;
      const dto = validateCreateTemplate(body);
      const template = await this.templateService.createTemplate(dto);
      return createdResponse(template);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async updateTemplate(
    req: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const body = (await req.json()) as unknown;
      const dto = validateUpdateTemplate(body);
      const template = await this.templateService.updateTemplate(params.id, dto);
      return successResponse(template);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async getTemplate(
    _req: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const template = await this.templateService.getTemplate(params.id);
      return successResponse(template);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async listTemplates(req: NextRequest) {
    try {
      const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
      const filter = validateTemplateFilter(searchParams);
      const result = await this.templateService.listTemplates(filter);
      return paginatedResponse(result.data, result.meta);
    } catch (error) {
      return handleRouteError(error);
    }
  }
}
