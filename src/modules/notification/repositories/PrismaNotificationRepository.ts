import type { Prisma } from "@prisma/client";
import { BaseRepository } from "@lib/baseRepository";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type {
  Notification,
  CreateNotificationData,
  UpdateNotificationData,
  NotificationFilter,
  DeliveryStatusType,
  NotificationTypeType,
} from "../types";

type PrismaNotification = Prisma.NotificationGetPayload<Record<string, never>>;

function toNotification(r: PrismaNotification): Notification {
  return {
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId ?? null,
    notificationType: r.notificationType as NotificationTypeType,
    recipient: r.recipient,
    subject: r.subject ?? null,
    message: r.message,
    deliveryStatus: r.deliveryStatus as DeliveryStatusType,
    retryCount: r.retryCount,
    maxRetries: r.maxRetries,
    scheduledAt: r.scheduledAt ?? null,
    deliveredAt: r.deliveredAt ?? null,
    failedReason: r.failedReason ?? null,
    metadata:
      r.metadata !== null && r.metadata !== undefined
        ? (r.metadata as Record<string, unknown>)
        : null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaNotificationRepository extends BaseRepository<
  Notification,
  CreateNotificationData,
  UpdateNotificationData
> {
  async findById(id: string): Promise<Nullable<Notification>> {
    const r = await this.db.notification.findFirst({ where: { id } });
    return r ? toNotification(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<Notification>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.notification.findMany({
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.notification.count(),
    ]);
    return {
      data: records.map(toNotification),
      meta: this.buildPaginationMeta(total, params),
    };
  }

  async findManyFiltered(
    filter: NotificationFilter
  ): Promise<PaginatedResult<Notification>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const params: PaginationParams = { page, limit };
    const skip = this.buildSkip(params);

    const where: Prisma.NotificationWhereInput = {
      ...(filter.organizationId && { organizationId: filter.organizationId }),
      ...(filter.hotelId && { hotelId: filter.hotelId }),
      ...(filter.notificationType && {
        notificationType: filter.notificationType as PrismaNotification["notificationType"],
      }),
      ...(filter.deliveryStatus && {
        deliveryStatus: filter.deliveryStatus as PrismaNotification["deliveryStatus"],
      }),
    };

    const [records, total] = await Promise.all([
      this.db.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.notification.count({ where }),
    ]);

    return {
      data: records.map(toNotification),
      meta: this.buildPaginationMeta(total, params),
    };
  }

  async findPendingRetries(): Promise<Notification[]> {
    const records = await this.db.notification.findMany({
      where: {
        deliveryStatus: "FAILED" as PrismaNotification["deliveryStatus"],
        retryCount: { lt: this.db.notification.fields.maxRetries },
      },
      take: 100,
      orderBy: { createdAt: "asc" },
    });
    return records.map(toNotification);
  }

  async create(data: CreateNotificationData): Promise<Notification> {
    const r = await this.db.notification.create({
      data: {
        organizationId: data.organizationId,
        hotelId: data.hotelId ?? null,
        notificationType: data.notificationType as PrismaNotification["notificationType"],
        recipient: data.recipient,
        subject: data.subject ?? null,
        message: data.message,
        scheduledAt: data.scheduledAt ?? null,
        metadata:
          data.metadata !== undefined
            ? (data.metadata as Prisma.InputJsonValue)
            : undefined,
      },
    });
    return toNotification(r);
  }

  async update(id: string, data: UpdateNotificationData): Promise<Notification> {
    const payload: Prisma.NotificationUpdateInput = {};
    if (data.deliveryStatus !== undefined) {
      payload.deliveryStatus = data.deliveryStatus as PrismaNotification["deliveryStatus"];
    }
    if (data.retryCount !== undefined) payload.retryCount = data.retryCount;
    if (data.deliveredAt !== undefined) payload.deliveredAt = data.deliveredAt;
    if (data.failedReason !== undefined) payload.failedReason = data.failedReason;

    const r = await this.db.notification.update({ where: { id }, data: payload });
    return toNotification(r);
  }

  async updateStatus(
    id: string,
    status: DeliveryStatusType,
    extra?: { deliveredAt?: Date; failedReason?: string }
  ): Promise<Notification> {
    const payload: Prisma.NotificationUpdateInput = {
      deliveryStatus: status as PrismaNotification["deliveryStatus"],
    };
    if (extra?.deliveredAt !== undefined) payload.deliveredAt = extra.deliveredAt;
    if (extra?.failedReason !== undefined) payload.failedReason = extra.failedReason;

    const r = await this.db.notification.update({ where: { id }, data: payload });
    return toNotification(r);
  }

  async incrementRetry(id: string): Promise<Notification> {
    const r = await this.db.notification.update({
      where: { id },
      data: {
        retryCount: { increment: 1 },
        deliveryStatus: "PENDING" as PrismaNotification["deliveryStatus"],
      },
    });
    return toNotification(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.notification.delete({ where: { id } });
  }
}
