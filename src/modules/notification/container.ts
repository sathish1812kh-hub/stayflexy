import { PrismaNotificationRepository } from "./repositories/PrismaNotificationRepository";
import { PrismaNotificationTemplateRepository } from "./repositories/PrismaNotificationTemplateRepository";
import { NotificationService } from "./services/NotificationService";
import { NotificationTemplateService } from "./services/NotificationTemplateService";

const notificationRepo = new PrismaNotificationRepository();
const templateRepo = new PrismaNotificationTemplateRepository();

export const notificationService = new NotificationService(
  notificationRepo,
  templateRepo
);

export const templateService = new NotificationTemplateService(templateRepo);
