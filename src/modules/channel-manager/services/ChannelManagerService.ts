import { BaseService } from "@lib/baseService";
import { prisma } from "@lib/prisma";
import { type Prisma } from "@prisma/client";
import { ForbiddenError, NotFoundError, ConflictError } from "@errors/HttpError";
import type { ChannelSyncResult, ChannelStatusSummary } from "../types";
import type { TriggerSyncDtoType } from "../dto";
import { CHANNEL_MANAGER_ERRORS, SYNC_PRIORITY } from "../constants";
import { syncStrategyRegistry } from "@modules/synchronization/strategies";
import { syncQueue } from "@modules/synchronization/queues";

export class ChannelManagerService extends BaseService {
  protected readonly moduleName = "ChannelManagerService";

  private async validateHotelAccess(hotelId: string, orgId: string): Promise<void> {
    const hotel = await prisma.hotel.findFirst({
      where: { id: hotelId, organizationId: orgId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!hotel) throw new ForbiddenError(CHANNEL_MANAGER_ERRORS.HOTEL_NOT_FOUND);
  }

  async triggerSync(dto: TriggerSyncDtoType, userId: string, orgId: string): Promise<ChannelSyncResult> {
    return this.execute("triggerSync", async () => {
      await this.validateHotelAccess(dto.hotelId, orgId);

      const provider = await prisma.oTAProvider.findFirst({
        where: { id: dto.providerId, status: "ACTIVE" },
        select: { id: true },
      });
      if (!provider) throw new NotFoundError(CHANNEL_MANAGER_ERRORS.PROVIDER_NOT_FOUND);

      const mapping = await prisma.oTAMapping.findFirst({
        where: { hotelId: dto.hotelId, providerId: dto.providerId, isActive: true, roomTypeId: null },
        select: { id: true },
      });
      if (!mapping) throw new ConflictError(CHANNEL_MANAGER_ERRORS.MAPPING_REQUIRED);

      if (!syncStrategyRegistry.getSupportedTypes().includes(dto.syncType)) {
        throw new ConflictError(CHANNEL_MANAGER_ERRORS.INVALID_SYNC_TYPE);
      }

      const idempotencyKey = `${dto.hotelId}:${dto.providerId}:${dto.syncType}:${Date.now()}`;

      const job = await prisma.syncJob.create({
        data: {
          organizationId: orgId,
          hotelId: dto.hotelId,
          providerId: dto.providerId,
          syncType: dto.syncType as Parameters<typeof prisma.syncJob.create>[0]["data"]["syncType"],
          syncStatus: "PENDING",
          idempotencyKey,
          maxRetries: dto.maxRetries ?? 3,
          payload: dto.payload as Prisma.InputJsonValue | undefined,
          createdById: userId,
        },
      });

      await prisma.syncEvent.create({
        data: {
          syncJobId: job.id,
          eventType: "SYNC_STARTED",
          processingStatus: "PENDING",
          eventDescription: `Sync job ${job.id} created for ${dto.syncType}`,
        } as Parameters<typeof prisma.syncEvent.create>[0]["data"],
      });

      const priority = SYNC_PRIORITY[dto.syncType as keyof typeof SYNC_PRIORITY] ?? 5;
      await syncQueue.enqueue({
        jobId: job.id,
        organizationId: orgId,
        hotelId: dto.hotelId,
        providerId: dto.providerId,
        syncType: dto.syncType,
        priority,
        enqueuedAt: new Date(),
        retryCount: 0,
      });

      return {
        syncJobId: job.id,
        syncType: dto.syncType,
        syncStatus: "PENDING",
        hotelId: dto.hotelId,
        providerId: dto.providerId,
        enqueuedAt: new Date(),
      };
    });
  }

  async getStatusSummary(hotelId: string, providerId: string | undefined, orgId: string): Promise<ChannelStatusSummary[]> {
    return this.execute("getStatusSummary", async () => {
      await this.validateHotelAccess(hotelId, orgId);

      const where = {
        organizationId: orgId,
        hotelId,
        ...(providerId ? { providerId } : {}),
      };

      const jobs = await prisma.syncJob.findMany({
        where,
        select: { syncStatus: true, completedAt: true, providerId: true },
        orderBy: { createdAt: "desc" },
      });

      const providerIds = [...new Set(jobs.map((j) => j.providerId))];

      return providerIds.map((pid) => {
        const providerJobs = jobs.filter((j) => j.providerId === pid);
        const lastSyncJob = providerJobs.find((j) => j.completedAt !== null);

        return {
          hotelId,
          providerId: pid,
          totalJobs: providerJobs.length,
          pendingJobs: providerJobs.filter((j) => j.syncStatus === "PENDING").length,
          runningJobs: providerJobs.filter((j) => j.syncStatus === "RUNNING").length,
          successJobs: providerJobs.filter((j) => j.syncStatus === "SUCCESS").length,
          failedJobs: providerJobs.filter((j) => j.syncStatus === "FAILED").length,
          retryingJobs: providerJobs.filter((j) => j.syncStatus === "RETRYING").length,
          lastSyncAt: lastSyncJob?.completedAt ?? null,
        } satisfies ChannelStatusSummary;
      });
    });
  }
}
