export type {
  Notification,
  NotificationTemplate,
  NotificationTypeType,
  DeliveryStatusType,
  CreateNotificationData,
  UpdateNotificationData,
  CreateTemplateData,
  UpdateTemplateData,
  NotificationFilter,
  TemplateFilter,
  RenderedNotification,
} from "./types";

export {
  NOTIFICATION_ERRORS,
  MAX_RETRY_COUNT,
  NOTIFICATION_QUEUE_PRIORITY,
  BOOKING_NOTIFICATION_TYPES,
} from "./constants";

export {
  CreateNotificationDto,
  SendNotificationDto,
  NotificationFilterDto,
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateFilterDto,
} from "./dto";
export type {
  CreateNotificationDtoType,
  SendNotificationDtoType,
  NotificationFilterDtoType,
  CreateTemplateDtoType,
  UpdateTemplateDtoType,
  TemplateFilterDtoType,
} from "./dto";

export {
  validateCreateNotification,
  validateSendNotification,
  validateNotificationFilter,
  validateCreateTemplate,
  validateUpdateTemplate,
  validateTemplateFilter,
} from "./validators";

export {
  PrismaNotificationRepository,
  PrismaNotificationTemplateRepository,
} from "./repositories";

export { TemplateRenderer } from "./utils";
export { InMemoryNotificationQueue, notificationQueue } from "./queues";
export type { QueuedNotification, INotificationQueue } from "./queues";

export { NotificationService } from "./services/NotificationService";
export { NotificationTemplateService } from "./services/NotificationTemplateService";

export { NotificationController } from "./controllers";

export { createNotificationRoutes } from "./routes";

export { notificationService, templateService } from "./container";
