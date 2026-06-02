import { z } from "zod";

const NotificationTypeEnum = z.enum([
  "EMAIL",
  "SMS",
  "WHATSAPP",
  "IN_APP",
  "PUSH",
]);

const DeliveryStatusEnum = z.enum([
  "PENDING",
  "QUEUED",
  "SENT",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
]);

export const CreateNotificationDto = z.object({
  organizationId: z.string().uuid("Invalid organization ID"),
  hotelId: z.string().uuid("Invalid hotel ID").optional(),
  notificationType: NotificationTypeEnum,
  recipient: z.union([
    z.string().email("Invalid email address"),
    z.string().min(5, "Recipient must be at least 5 characters"),
  ]),
  subject: z.string().max(500, "Subject must be at most 500 characters").optional(),
  message: z.string().min(1, "Message is required"),
  scheduledAt: z.string().datetime({ message: "Invalid ISO datetime" }).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const SendNotificationDto = z.object({
  templateName: z.string().min(1, "Template name is required"),
  organizationId: z.string().uuid("Invalid organization ID"),
  hotelId: z.string().uuid("Invalid hotel ID").optional(),
  notificationType: NotificationTypeEnum,
  recipient: z.string().min(5, "Recipient must be at least 5 characters"),
  variables: z.record(z.string(), z.string()),
});

export const NotificationFilterDto = z.object({
  organizationId: z.string().uuid("Invalid organization ID").optional(),
  hotelId: z.string().uuid("Invalid hotel ID").optional(),
  notificationType: NotificationTypeEnum.optional(),
  deliveryStatus: DeliveryStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const CreateTemplateDto = z.object({
  templateName: z
    .string()
    .min(2, "Template name must be at least 2 characters")
    .max(100, "Template name must be at most 100 characters"),
  templateType: NotificationTypeEnum,
  subjectTemplate: z
    .string()
    .max(500, "Subject template must be at most 500 characters")
    .optional(),
  bodyTemplate: z.string().min(1, "Body template is required"),
  variables: z.array(z.string()).default([]),
});

export const UpdateTemplateDto = z.object({
  subjectTemplate: z
    .string()
    .max(500, "Subject template must be at most 500 characters")
    .optional(),
  bodyTemplate: z.string().min(1, "Body template cannot be empty").optional(),
  variables: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const TemplateFilterDto = z.object({
  templateType: NotificationTypeEnum.optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateNotificationDtoType = z.infer<typeof CreateNotificationDto>;
export type SendNotificationDtoType = z.infer<typeof SendNotificationDto>;
export type NotificationFilterDtoType = z.infer<typeof NotificationFilterDto>;
export type CreateTemplateDtoType = z.infer<typeof CreateTemplateDto>;
export type UpdateTemplateDtoType = z.infer<typeof UpdateTemplateDto>;
export type TemplateFilterDtoType = z.infer<typeof TemplateFilterDto>;
