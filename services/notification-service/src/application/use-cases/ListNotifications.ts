import { buildPaginationMeta } from '@stayflexi/shared-types'
import type { PaginationMeta } from '@stayflexi/shared-types'
import type { INotificationRepository, NotificationFilters } from '../../domain/repositories/INotificationRepository'
import type { Notification } from '../../domain/entities/Notification'

export interface ListNotificationsResult {
  data: Notification[]
  meta: PaginationMeta
}

export class ListNotifications {
  constructor(private readonly notificationRepo: INotificationRepository) {}

  async execute(
    organizationId: string,
    filters: NotificationFilters,
  ): Promise<ListNotificationsResult> {
    const page = filters.page ?? 1
    const limit = filters.limit ?? 20

    const { data, total } = await this.notificationRepo.findByOrganization(
      organizationId,
      filters,
    )

    const meta = buildPaginationMeta(total, page, limit)

    return { data, meta }
  }
}
