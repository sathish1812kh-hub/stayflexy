import { BaseService } from "@lib/baseService";
import { NotFoundError, ConflictError } from "@errors/HttpError";
import type { PrismaBackgroundJobRepository } from "../repositories/PrismaBackgroundJobRepository";
import type { BackgroundJob, JobFilter } from "../types";
import type { CreateJobDtoType, JobFilterDtoType } from "../dto";
import { JOB_ERRORS } from "../constants";
import { jobScheduler } from "../schedulers/JobScheduler";
import type { PaginatedResult } from "@shared-types";

export class JobService extends BaseService {
  protected readonly moduleName = "JobService";

  constructor(private readonly jobRepo: PrismaBackgroundJobRepository) {
    super();
  }

  async createJob(dto: CreateJobDtoType): Promise<BackgroundJob> {
    return this.execute("createJob", async () => {
      if (dto.idempotencyKey) {
        const existing = await this.jobRepo.findByIdempotencyKey(dto.idempotencyKey);
        if (existing) throw new ConflictError(JOB_ERRORS.IDEMPOTENCY_CONFLICT);
      }

      const job = await this.jobRepo.create({
        jobType: dto.jobType,
        payload: dto.payload,
        maxRetries: dto.maxRetries,
        idempotencyKey: dto.idempotencyKey,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      });

      return job;
    });
  }

  async executeJob(id: string): Promise<BackgroundJob> {
    return this.execute("executeJob", async () => {
      const job = await this.jobRepo.findById(id);
      if (!job) throw new NotFoundError(JOB_ERRORS.NOT_FOUND);

      if (job.jobStatus === "RUNNING") throw new ConflictError(JOB_ERRORS.ALREADY_RUNNING);
      if (job.jobStatus === "COMPLETED") throw new ConflictError(JOB_ERRORS.ALREADY_COMPLETED);

      await this.jobRepo.updateStatus(id, "RUNNING", { startedAt: new Date() });

      try {
        await jobScheduler.dispatch(job);
        return await this.jobRepo.updateStatus(id, "COMPLETED", { completedAt: new Date() });
      } catch (err) {
        const failedReason = err instanceof Error ? err.message : "Unknown error";
        const nextRetry = job.retryCount + 1;

        if (nextRetry >= job.maxRetries) {
          return await this.jobRepo.updateStatus(id, "DEAD_LETTER", {
            completedAt: new Date(),
            failedReason,
            retryCount: nextRetry,
          });
        }

        return await this.jobRepo.updateStatus(id, "FAILED", {
          failedReason,
          retryCount: nextRetry,
        });
      }
    });
  }

  async cancelJob(id: string): Promise<BackgroundJob> {
    return this.execute("cancelJob", async () => {
      const job = await this.jobRepo.findById(id);
      if (!job) throw new NotFoundError(JOB_ERRORS.NOT_FOUND);
      if (job.jobStatus === "RUNNING") throw new ConflictError(JOB_ERRORS.ALREADY_RUNNING);
      return this.jobRepo.updateStatus(id, "CANCELLED", { completedAt: new Date() });
    });
  }

  async getJob(id: string): Promise<BackgroundJob> {
    return this.execute("getJob", async () => {
      const job = await this.jobRepo.findById(id);
      if (!job) throw new NotFoundError(JOB_ERRORS.NOT_FOUND);
      return job;
    });
  }

  async listJobs(filter: JobFilterDtoType): Promise<PaginatedResult<BackgroundJob>> {
    return this.execute("listJobs", async () => {
      const jobFilter: JobFilter = {
        jobType: filter.jobType,
        jobStatus: filter.jobStatus,
        page: filter.page,
        limit: filter.limit,
      };
      return this.jobRepo.findManyFiltered(jobFilter);
    });
  }

  async processPendingJobs(): Promise<{ processed: number; failed: number }> {
    return this.execute("processPendingJobs", async () => {
      const jobs = await this.jobRepo.findPendingJobs();
      let processed = 0;
      let failed = 0;

      for (const job of jobs) {
        try {
          await this.executeJob(job.id);
          processed++;
        } catch {
          failed++;
        }
      }

      return { processed, failed };
    });
  }
}
