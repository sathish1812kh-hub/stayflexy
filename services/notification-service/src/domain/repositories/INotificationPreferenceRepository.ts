import type { NotificationPreference } from '../entities/NotificationPreference'

export interface UpsertPreferenceData {
  organizationId: string
  userId: string
  channel: string
  isEnabled: boolean
  preferences?: unknown
}

export interface INotificationPreferenceRepository {
  findById(id: string): Promise<NotificationPreference | null>
  findByUser(organizationId: string, userId: string): Promise<NotificationPreference[]>
  upsert(data: UpsertPreferenceData): Promise<NotificationPreference>
  delete(id: string): Promise<void>
}
