import type { JobHandler, BackgroundJob } from "../types";

// In-memory job handler registry + scheduler.
// Production: replace with BullMQ workers registered per jobType.
class JobScheduler {
  private readonly handlers = new Map<string, JobHandler>();

  register(handler: JobHandler): void {
    this.handlers.set(handler.jobType, handler);
  }

  getHandler(jobType: string): JobHandler | null {
    return this.handlers.get(jobType) ?? null;
  }

  getSupportedTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  async dispatch(job: BackgroundJob): Promise<void> {
    const handler = this.handlers.get(job.jobType);
    if (!handler) {
      throw new Error(`No handler registered for job type: ${job.jobType}`);
    }
    await handler.execute(job);
  }
}

export const jobScheduler = new JobScheduler();
