import { ZodError } from "zod";
import { ValidationError } from "@errors/HttpError";
import {
  CreateNotificationDto,
  SendNotificationDto,
  NotificationFilterDto,
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateFilterDto,
  type CreateNotificationDtoType,
  type SendNotificationDtoType,
  type NotificationFilterDtoType,
  type CreateTemplateDtoType,
  type UpdateTemplateDtoType,
  type TemplateFilterDtoType,
} from "../dto";

function wrapZod<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      throw new ValidationError("Validation failed", details);
    }
    throw error;
  }
}

export function validateCreateNotification(data: unknown): CreateNotificationDtoType {
  return wrapZod(() => CreateNotificationDto.parse(data));
}

export function validateSendNotification(data: unknown): SendNotificationDtoType {
  return wrapZod(() => SendNotificationDto.parse(data));
}

export function validateNotificationFilter(data: unknown): NotificationFilterDtoType {
  return wrapZod(() => NotificationFilterDto.parse(data));
}

export function validateCreateTemplate(data: unknown): CreateTemplateDtoType {
  return wrapZod(() => CreateTemplateDto.parse(data));
}

export function validateUpdateTemplate(data: unknown): UpdateTemplateDtoType {
  return wrapZod(() => UpdateTemplateDto.parse(data));
}

export function validateTemplateFilter(data: unknown): TemplateFilterDtoType {
  return wrapZod(() => TemplateFilterDto.parse(data));
}
