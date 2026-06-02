import { BaseService } from "@lib/baseService";
import { NotFoundError, ValidationError } from "@errors/HttpError";
import type { PaginatedResult } from "@shared-types";
import type { PrismaNotificationRepository } from "../repositories/PrismaNotificationRepository";
import type { PrismaNotificationTemplateRepository } from "../repositories/PrismaNotificationTemplateRepository";
import type {
  Notification,
  CreateNotificationData,
  NotificationFilter,
} from "../types";
import type {
  CreateNotificationDtoType,
  SendNotificationDtoType,
  NotificationFilterDtoType,
} from "../dto";
import { NOTIFICATION_ERRORS, NOTIFICATION_QUEUE_PRIORITY } from "../constants";
import { TemplateRenderer } from "../utils/TemplateRenderer";
import { notificationQueue } from "../queues/NotificationQueue";

export class NotificationService extends BaseService {
  protected readonly moduleName = "NotificationService";

  constructor(
    private readonly notificationRepo: PrismaNotificationRepository,
    private readonly templateRepo: PrismaNotificationTemplateRepository
  ) {
    super();
  }

  async createNotification(
    dto: CreateNotificationDtoType,
    orgId: string
  ): Promise<Notification> {
    return this.execute("createNotification", async () => {
      const data: CreateNotificationData = {
        organizationId: orgId,
        hotelId: dto.hotelId,
        notificationType: dto.notificationType,
        recipient: dto.recipient,
        subject: dto.subject,
        message: dto.message,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        metadata: dto.metadata as Record<string, unknown> | undefined,
      };

      const notification = await this.notificationRepo.create(data);

      const priorityMap = NOTIFICATION_QUEUE_PRIORITY;
      const priority = priorityMap[dto.notificationType];

      await notificationQueue.enqueue({
        notificationId: notification.id,
        notificationType: notification.notificationType,
        recipient: notification.recipient,
        priority,
        enqueuedAt: new Date(),
        retryCount: notification.retryCount,
      });

      return notification;
    });
  }

  async sendFromTemplate(
    dto: SendNotificationDtoType,
    orgId: string
  ): Promise<Notification> {
    return this.execute("sendFromTemplate", async () => {
      const template = await this.templateRepo.findByName(dto.templateName);
      if (!template) {
        throw new NotFoundError(NOTIFICATION_ERRORS.TEMPLATE_NOT_FOUND);
      }

      const missing = TemplateRenderer.validateVariables(
        template.variables,
        dto.variables
      );
      if (missing.length > 0) {
        throw new ValidationError(
          `Missing required template variables: ${missing.join(", ")}`
        );
      }

      const rendered = TemplateRenderer.renderNotification(
        template.subjectTemplate,
        template.bodyTemplate,
        dto.variables
      );

      const notification = await this.notificationRepo.create({
        organizationId: orgId,
        hotelId: dto.hotelId,
        notificationType: dto.notificationType,
        recipient: dto.recipient,
        subject: rendered.subject ?? undefined,
        message: rendered.body,
      });

      await this.notificationRepo.updateStatus(notification.id, "QUEUED");

      const priorityMap = NOTIFICATION_QUEUE_PRIORITY;
      const priority = priorityMap[dto.notificationType];

      await notificationQueue.enqueue({
        notificationId: notification.id,
        notificationType: notification.notificationType,
        recipient: notification.recipient,
        priority,
        enqueuedAt: new Date(),
        retryCount: notification.retryCount,
      });

      return { ...notification, deliveryStatus: "QUEUED" };
    });
  }

  async processNotification(id: string): Promise<Notification> {
    return this.execute("processNotification", async () => {
      const notification = await this.notificationRepo.findById(id);
      if (!notification) {
        throw new NotFoundError(NOTIFICATION_ERRORS.NOT_FOUND);
      }

      if (
        notification.deliveryStatus !== "PENDING" &&
        notification.deliveryStatus !== "QUEUED"
      ) {
        return notification;
      }

      // Simulate delivery: PENDING/QUEUED → SENT → DELIVERED
      await this.notificationRepo.updateStatus(id, "SENT");
      const delivered = await this.notificationRepo.updateStatus(id, "DELIVERED", {
        deliveredAt: new Date(),
      });

      return delivered;
    });
  }

  async retryFailed(): Promise<{ retried: number }> {
    return this.execute("retryFailed", async () => {
      const failed = await this.notificationRepo.findPendingRetries();

      for (const notification of failed) {
        await this.notificationRepo.incrementRetry(notification.id);

        const priorityMap = NOTIFICATION_QUEUE_PRIORITY;
        const priority = priorityMap[notification.notificationType];

        await notificationQueue.enqueue({
          notificationId: notification.id,
          notificationType: notification.notificationType,
          recipient: notification.recipient,
          priority,
          enqueuedAt: new Date(),
          retryCount: notification.retryCount + 1,
        });
      }

      return { retried: failed.length };
    });
  }

  async listNotifications(
    filter: NotificationFilterDtoType,
    orgId: string
  ): Promise<PaginatedResult<Notification>> {
    return this.execute("listNotifications", async () => {
      const notificationFilter: NotificationFilter = {
        organizationId: orgId,
        hotelId: filter.hotelId,
        notificationType: filter.notificationType,
        deliveryStatus: filter.deliveryStatus,
        page: filter.page,
        limit: filter.limit,
      };
      return this.notificationRepo.findManyFiltered(notificationFilter);
    });
  }

  async getNotification(id: string): Promise<Notification> {
    return this.execute("getNotification", async () => {
      const notification = await this.notificationRepo.findById(id);
      if (!notification) {
        throw new NotFoundError(NOTIFICATION_ERRORS.NOT_FOUND);
      }
      return notification;
    });
  }
}
