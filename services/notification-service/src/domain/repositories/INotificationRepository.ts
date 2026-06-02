import type { Notification } from '../entities/Notification'

export interface NotificationFilters {
  hotelId?: string
  notificationType?: string
  deliveryStatus?: string
  page?: number
  limit?: number
}

export interface CreateNotificationData {
  organizationId: string
  hotelId?: string
  notificationType: string
  recipient: string
  subject?: string
  message: string
  maxRetries?: number
  scheduledAt?: Date
  metadata?: unknown
}

export interface UpdateNotificationData {
  deliveredAt?: Date
  failedReason?: string
}

export interface INotificationRepository {
  findById(id: string): Promise<Notification | null>
  findByOrganization(
    organizationId: string,
    filters: NotificationFilters,
  ): Promise<{ data: Notification[]; total: number }>
  findFailedForRetry(limit?: number): Promise<Notification[]>
  create(data: CreateNotificationData): Promise<Notification>
  updateStatus(id: string, status: string, data?: UpdateNotificationData): Promise<Notification>
  incrementRetry(id: string): Promise<Notification>
}
