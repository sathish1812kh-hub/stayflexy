import type { PrismaClient } from '@prisma/client'
import type { DeliveryStatus, NotificationType } from '@prisma/client'
import { Prisma } from '@stayflexi/shared-database'
import { fromPrismaError } from '@stayflexi/shared-errors'
import { Notification } from '../../domain/entities/Notification'
import type { NotificationProps } from '../../domain/entities/Notification'
import type {
  INotificationRepository,
  NotificationFilters,
  CreateNotificationData,
  UpdateNotificationData,
} from '../../domain/repositories/INotificationRepository'

type PrismaNotification = {
  id: string
  organizationId: string
  hotelId: string | null
  notificationType: string
  recipient: string
  subject: string | null
  message: string
  deliveryStatus: string
  retryCount: number
  maxRetries: number
  scheduledAt: Date | null
  deliveredAt: Date | null
  failedReason: string | null
  metadata: unknown
  createdAt: Date
  updatedAt: Date
}

function mapToEntity(r: PrismaNotification): Notification {
  const props: NotificationProps = {
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    notificationType: r.notificationType,
    recipient: r.recipient,
    subject: r.subject,
    message: r.message,
    deliveryStatus: r.deliveryStatus,
    retryCount: r.retryCount,
    maxRetries: r.maxRetries,
    scheduledAt: r.scheduledAt,
    deliveredAt: r.deliveredAt,
    failedReason: r.failedReason,
    metadata: r.metadata,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
  return new Notification(props)
}

export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<Notification | null> {
    try {
      const r = await this.db.notification.findUnique({ where: { id } })
      return r ? mapToEntity(r) : null
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async findByOrganization(
    organizationId: string,
    filters: NotificationFilters,
  ): Promise<{ data: Notification[]; total: number }> {
    try {
      const page = filters.page ?? 1
      const limit = filters.limit ?? 20
      const skip = (Math.max(1, page) - 1) * Math.max(1, limit)

      const where = {
        organizationId,
        ...(filters.hotelId !== undefined ? { hotelId: filters.hotelId } : {}),
        ...(filters.notificationType !== undefined
          ? { notificationType: filters.notificationType as NotificationType }
          : {}),
        ...(filters.deliveryStatus !== undefined
          ? { deliveryStatus: filters.deliveryStatus as DeliveryStatus }
          : {}),
      }

      const [records, total] = await Promise.all([
        this.db.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.db.notification.count({ where }),
      ])

      return { data: records.map(mapToEntity), total }
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async findFailedForRetry(limit?: number): Promise<Notification[]> {
    try {
      const records = await this.db.notification.findMany({
        where: { deliveryStatus: 'FAILED' as DeliveryStatus },
        take: limit ?? 50,
        orderBy: { updatedAt: 'asc' },
      })
      return records
        .filter((r) => r.retryCount < r.maxRetries)
        .map(mapToEntity)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async create(data: CreateNotificationData): Promise<Notification> {
    try {
      const r = await this.db.notification.create({
        data: {
          organizationId: data.organizationId,
          hotelId: data.hotelId ?? null,
          notificationType: data.notificationType as NotificationType,
          recipient: data.recipient,
          subject: data.subject ?? null,
          message: data.message,
          maxRetries: data.maxRetries ?? 3,
          scheduledAt: data.scheduledAt ?? null,
          metadata:
            data.metadata !== undefined
              ? (data.metadata as Prisma.InputJsonValue)
              : undefined,
        },
      })
      return mapToEntity(r)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async updateStatus(
    id: string,
    status: string,
    data?: UpdateNotificationData,
  ): Promise<Notification> {
    try {
      const r = await this.db.notification.update({
        where: { id },
        data: {
          deliveryStatus: status as DeliveryStatus,
          ...(data?.deliveredAt !== undefined ? { deliveredAt: data.deliveredAt } : {}),
          ...(data?.failedReason !== undefined ? { failedReason: data.failedReason } : {}),
        },
      })
      return mapToEntity(r)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async incrementRetry(id: string): Promise<Notification> {
    try {
      const r = await this.db.notification.update({
        where: { id },
        data: { retryCount: { increment: 1 } },
      })
      return mapToEntity(r)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }
}
