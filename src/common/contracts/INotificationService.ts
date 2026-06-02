export type NotificationChannel = "EMAIL" | "SMS" | "PUSH" | "IN_APP";

export interface NotificationPayload {
  recipientId: string;
  channel: NotificationChannel;
  templateKey: string;
  variables: Record<string, string>;
  scheduledAt?: Date;
}

export interface INotificationService {
  send(payload: NotificationPayload): Promise<void>;
  sendBulk(payloads: NotificationPayload[]): Promise<void>;
  getUnreadCount(userId: string): Promise<number>;
}
