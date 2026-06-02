// FILE: src/modules/synchronization/services/SyncJobService.ts
import { BaseService } from "@lib/baseService";
import { prisma } from "@lib/prisma";
import { NotFoundError, ConflictError, ForbiddenError, BadRequestError } from "@errors/HttpError";
import type { PaginatedResult } from "@shared-types";
import type { PrismaSyncJobRepository } from "../repositories/PrismaSyncJobRepository";
import type { PrismaSyncEventRepository } from "../repositories/PrismaSyncEventRepository";
import type { SyncJob, SyncEvent, SyncJobFilter } from "../types";
import type { CreateSyncJobDtoType, SyncJobFilterDtoType } from "../dto";
import { SYNC_ERRORS, RETRY_BACKOFF_BASE_MS } from "../constants";
import { syncStrategyRegistry } from "../strategies/SyncStrategyRegistry";
import { syncQueue, retryQueue, deadLetterQueue } from "../queues";
import { computeRetryDelay } from "../queues/RetryQueue";

export class SyncJobService extends BaseService {
  protected readonly moduleName = "SyncJobService";

  constructor(
    private readonly jobRepo: PrismaSyncJobRepository,
    private readonly eventRepo: PrismaSyncEventRepository
  ) {
    super();
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private async validateJobOrgAccess(id: string, orgId: string): Promise<SyncJob> {
    const job = await this.jobRepo.findById(id);
    if (!job) throw new NotFoundError(SYNC_ERRORS.JOB_NOT_FOUND);
    if (job.organizationId !== orgId) throw new ForbiddenError(SYNC_ERRORS.JOB_NOT_FOUND);
    return job;
  }

  // ─── createSyncJob ────────────────────────────────────────────────────────────

  async createSyncJob(
    dto: CreateSyncJobDtoType,
    userId: string,
    orgId: string
  ): Promise<SyncJob> {
    return this.execute("createSyncJob", async () => {
      // 1. Validate hotel belongs to org
      const hotel = await prisma.hotel.findFirst({
        where: { id: dto.hotelId, organizationId: orgId, deletedAt: null },
        select: { id: true, status: true },
      });
      if (!hotel) throw new NotFoundError(SYNC_ERRORS.HOTEL_INACTIVE);

      // 2. Validate hotel is ACTIVE
      if (hotel.status !== "ACTIVE") {
        throw new BadRequestError(SYNC_ERRORS.HOTEL_INACTIVE);
      }

      // 3. Validate provider exists and is ACTIVE
      const provider = await prisma.oTAProvider.findFirst({
        where: { id: dto.providerId },
        select: { id: true, status: true },
      });
      if (!provider || provider.status !== "ACTIVE") {
        throw new BadRequestError(SYNC_ERRORS.PROVIDER_INACTIVE);
      }

      // 4. Validate active OTA mapping exists for hotel + provider (hotel-level: roomTypeId = null)
      const mapping = await prisma.oTAMapping.findFirst({
        where: {
          hotelId: dto.hotelId,
          providerId: dto.providerId,
          isActive: true,
          roomTypeId: null,
        },
        select: { id: true },
      });
      if (!mapping) throw new BadRequestError(SYNC_ERRORS.NO_MAPPING_FOUND);

      // 5. Generate idempotency key with timestamp for uniqueness
      const idempotencyKey = `${dto.hotelId}:${dto.providerId}:${dto.syncType}:${Date.now()}`;

      // 6. Check for a recent PENDING or RUNNING job with same hotel+provider+syncType
      //    by scanning the exact key (exact-match guard — timestamp makes collisions impossible
      //    except for exact replays)
      const existing = await this.jobRepo.findByIdempotencyKey(idempotencyKey);
      if (existing && (existing.syncStatus === "PENDING" || existing.syncStatus === "RUNNING")) {
        throw new ConflictError(SYNC_ERRORS.IDEMPOTENCY_CONFLICT);
      }

      // 7. Create job with status = PENDING
      const job = await this.jobRepo.create({
        organizationId: orgId,
        hotelId: dto.hotelId,
        providerId: dto.providerId,
        syncType: dto.syncType,
        idempotencyKey,
        createdById: userId,
        payload: dto.payload ?? null,
        maxRetries: dto.maxRetries ?? 3,
      });

      // 8. Create SYNC_STARTED event
      await this.eventRepo.create({
        syncJobId: job.id,
        eventType: "SYNC_STARTED",
        processingStatus: "PENDING",
        payload: { syncType: job.syncType, hotelId: job.hotelId, providerId: job.providerId },
      });

      // 9. Enqueue to syncQueue
      await syncQueue.enqueue({
        jobId: job.id,
        organizationId: job.organizationId,
        hotelId: job.hotelId,
        providerId: job.providerId,
        syncType: job.syncType,
        priority: 1,
        enqueuedAt: new Date(),
        retryCount: 0,
      });

      return job;
    });
  }

  // ─── executeSyncJob ───────────────────────────────────────────────────────────

  async executeSyncJob(id: string, orgId: string): Promise<SyncJob> {
    return this.execute("executeSyncJob", async () => {
      // 1. Find job and validate org access
      let job = await this.validateJobOrgAccess(id, orgId);

      // 2. Check status: only PENDING or RETRYING can be executed
      if (job.syncStatus !== "PENDING" && job.syncStatus !== "RETRYING") {
        throw new ConflictError(SYNC_ERRORS.JOB_ALREADY_RUNNING);
      }

      // 3. Update status → RUNNING, set startedAt
      job = await this.jobRepo.updateStatus(id, "RUNNING", { startedAt: new Date() });

      // 4. Create SYNC_STARTED event with RUNNING status
      await this.eventRepo.create({
        syncJobId: job.id,
        eventType: "SYNC_STARTED",
        processingStatus: "RUNNING",
        payload: { syncType: job.syncType, retryCount: job.retryCount },
      });

      // 5. Get strategy
      const strategy = syncStrategyRegistry.getStrategy(job.syncType);

      // 6. Execute strategy
      const result = await strategy.execute(job);

      if (result.success) {
        // 7a. Success path
        job = await this.jobRepo.updateStatus(id, "SUCCESS", { completedAt: new Date() });
        await this.eventRepo.create({
          syncJobId: job.id,
          eventType: "SYNC_COMPLETED",
          processingStatus: "SUCCESS",
          payload: {
            recordsProcessed: result.recordsProcessed,
            metadata: result.metadata ?? null,
          },
        });
      } else {
        // 7b. Failure path
        const errorMessage = result.errors.join("; ");

        if (job.retryCount < job.maxRetries) {
          // Increment retryCount and move to RETRYING
          const newRetryCount = job.retryCount + 1;
          job = await this.jobRepo.updateStatus(id, "RETRYING", {
            retryCount: newRetryCount,
            errorMessage,
          });

          await this.eventRepo.create({
            syncJobId: job.id,
            eventType: "RETRY_INITIATED",
            processingStatus: "RETRYING",
            payload: { retryCount: newRetryCount, errorMessage },
          });

          // Schedule retry with exponential backoff
          const delayMs = computeRetryDelay(newRetryCount, RETRY_BACKOFF_BASE_MS);
          const nextRetryAt = new Date(Date.now() + delayMs);
          await retryQueue.scheduleRetry({
            jobId: job.id,
            organizationId: job.organizationId,
            hotelId: job.hotelId,
            providerId: job.providerId,
            syncType: job.syncType,
            priority: 1,
            enqueuedAt: new Date(),
            retryCount: newRetryCount,
            nextRetryAt,
            failureReason: errorMessage,
          });
        } else {
          // Retry limit exceeded — move to FAILED and dead-letter
          job = await this.jobRepo.updateStatus(id, "FAILED", {
            completedAt: new Date(),
            errorMessage,
          });

          await this.eventRepo.create({
            syncJobId: job.id,
            eventType: "SYNC_FAILED",
            processingStatus: "FAILED",
            payload: { retryCount: job.retryCount, errorMessage },
          });

          await deadLetterQueue.add({
            jobId: job.id,
            organizationId: job.organizationId,
            hotelId: job.hotelId,
            providerId: job.providerId,
            syncType: job.syncType,
            failureReason: errorMessage,
            retryCount: job.retryCount,
            deadLetterAt: new Date(),
          });
        }
      }

      return job;
    });
  }

  // ─── retrySyncJob ─────────────────────────────────────────────────────────────

  async retrySyncJob(id: string, orgId: string): Promise<SyncJob> {
    return this.execute("retrySyncJob", async () => {
      // 1. Find job and validate org access
      let job = await this.validateJobOrgAccess(id, orgId);

      // 2. Must be FAILED status
      if (job.syncStatus !== "FAILED") {
        throw new ConflictError(`Cannot retry a job with status: ${job.syncStatus}`);
      }

      // 3. Check retryCount < maxRetries
      if (job.retryCount >= job.maxRetries) {
        throw new ConflictError(SYNC_ERRORS.JOB_RETRY_LIMIT_EXCEEDED);
      }

      // 4. Reset to PENDING and increment retryCount
      const newRetryCount = job.retryCount + 1;
      job = await this.jobRepo.updateStatus(id, "PENDING", {
        retryCount: newRetryCount,
        errorMessage: undefined,
      });

      // 5. Create RETRY_INITIATED event
      await this.eventRepo.create({
        syncJobId: job.id,
        eventType: "RETRY_INITIATED",
        processingStatus: "PENDING",
        payload: { retryCount: newRetryCount, manualRetry: true },
      });

      // 6. Re-enqueue to syncQueue
      await syncQueue.enqueue({
        jobId: job.id,
        organizationId: job.organizationId,
        hotelId: job.hotelId,
        providerId: job.providerId,
        syncType: job.syncType,
        priority: 1,
        enqueuedAt: new Date(),
        retryCount: newRetryCount,
      });

      return job;
    });
  }

  // ─── cancelSyncJob ────────────────────────────────────────────────────────────

  async cancelSyncJob(id: string, orgId: string): Promise<SyncJob> {
    return this.execute("cancelSyncJob", async () => {
      const job = await this.validateJobOrgAccess(id, orgId);

      if (job.syncStatus !== "PENDING" && job.syncStatus !== "RETRYING") {
        throw new ConflictError(
          `Cannot cancel a job with status: ${job.syncStatus}`
        );
      }

      return this.jobRepo.updateStatus(id, "CANCELLED", { completedAt: new Date() });
    });
  }

  // ─── listSyncJobs ─────────────────────────────────────────────────────────────

  async listSyncJobs(
    filter: SyncJobFilterDtoType,
    orgId: string
  ): Promise<PaginatedResult<SyncJob>> {
    return this.execute("listSyncJobs", async () => {
      // Validate hotel access if hotelId provided
      if (filter.hotelId !== undefined) {
        const hotel = await prisma.hotel.findFirst({
          where: { id: filter.hotelId, organizationId: orgId, deletedAt: null },
          select: { id: true },
        });
        if (!hotel) throw new ForbiddenError(SYNC_ERRORS.HOTEL_INACTIVE);
      }

      const syncFilter: SyncJobFilter = {
        organizationId: orgId,
        hotelId: filter.hotelId,
        providerId: filter.providerId,
        syncType: filter.syncType,
        syncStatus: filter.syncStatus,
        page: filter.page,
        limit: filter.limit,
      };

      return this.jobRepo.findManyFiltered(syncFilter);
    });
  }

  // ─── getSyncJob ───────────────────────────────────────────────────────────────

  async getSyncJob(id: string, orgId: string): Promise<SyncJob> {
    return this.execute("getSyncJob", async () => {
      return this.validateJobOrgAccess(id, orgId);
    });
  }

  // ─── getSyncEvents ────────────────────────────────────────────────────────────

  async getSyncEvents(jobId: string, orgId: string): Promise<SyncEvent[]> {
    return this.execute("getSyncEvents", async () => {
      // 1. Find job and validate org access
      await this.validateJobOrgAccess(jobId, orgId);

      // 2. Return events for this job
      return this.eventRepo.findByJob(jobId);
    });
  }
}
