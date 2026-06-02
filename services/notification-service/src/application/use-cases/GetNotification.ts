import { NotFoundError, ForbiddenError } from '@stayflexi/shared-errors'
import type { INotificationRepository } from '../../domain/repositories/INotificationRepository'
import type { Notification } from '../../domain/entities/Notification'

export class GetNotification {
  constructor(private readonly notificationRepo: INotificationRepository) {}

  async execute(notificationId: string, organizationId: string): Promise<Notification> {
    const notification = await this.notificationRepo.findById(notificationId)
    if (!notification) {
      throw new NotFoundError(`Notification not found: ${notificationId}`)
    }
    if (!notification.belongsToOrganization(organizationId)) {
      throw new ForbiddenError('Access denied to this notification')
    }
    return notification
  }
}
