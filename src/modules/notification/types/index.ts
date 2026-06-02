import type { Nullable } from "@shared-types";

export type NotificationTypeType =
  | "EMAIL"
  | "SMS"
  | "WHATSAPP"
  | "IN_APP"
  | "PUSH";

export type DeliveryStatusType =
  | "PENDING"
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED";

export interface Notification {
  id: string;
  organizationId: string;
  hotelId: Nullable<string>;
  notificationType: NotificationTypeType;
  recipient: string;
  subject: Nullable<string>;
  message: string;
  deliveryStatus: DeliveryStatusType;
  retryCount: number;
  maxRetries: number;
  scheduledAt: Nullable<Date>;
  deliveredAt: Nullable<Date>;
  failedReason: Nullable<string>;
  metadata: Nullable<Record<string, unknown>>;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplate {
  id: string;
  templateName: string;
  templateType: NotificationTypeType;
  subjectTemplate: Nullable<string>;
  bodyTemplate: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationData {
  organizationId: string;
  hotelId?: string;
  notificationType: NotificationTypeType;
  recipient: string;
  subject?: string;
  message: string;
  scheduledAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface UpdateNotificationData {
  deliveryStatus?: DeliveryStatusType;
  retryCount?: number;
  deliveredAt?: Date;
  failedReason?: string;
}

export interface CreateTemplateData {
  templateName: string;
  templateType: NotificationTypeType;
  subjectTemplate?: string;
  bodyTemplate: string;
  variables: string[];
}

export interface UpdateTemplateData {
  subjectTemplate?: string;
  bodyTemplate?: string;
  variables?: string[];
  isActive?: boolean;
}

export interface NotificationFilter {
  organizationId?: string;
  hotelId?: string;
  notificationType?: NotificationTypeType;
  deliveryStatus?: DeliveryStatusType;
  page?: number;
  limit?: number;
}

export interface TemplateFilter {
  templateType?: NotificationTypeType;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface RenderedNotification {
  subject: string | null;
  body: string;
}
