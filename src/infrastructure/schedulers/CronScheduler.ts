import type { ScheduledJob } from "./types";

type IntervalHandle = ReturnType<typeof setInterval>;
type StoredJob = ScheduledJob & { handle: IntervalHandle | null };

export class CronScheduler {
  private readonly jobs = new Map<string, StoredJob>();

  register(job: ScheduledJob): void {
    if (!job.intervalMs) {
      this.jobs.set(job.name, { ...job, handle: null });
      return;
    }

    const handle: IntervalHandle | null = job.enabled
      ? setInterval(async () => {
          await this.run(job.name);
        }, job.intervalMs)
      : null;

    // unref() keeps Node.js process from being kept alive by this timer (no-op in browser)
    if (handle !== null && typeof (handle as unknown as { unref?: () => void }).unref === "function") {
      (handle as unknown as { unref: () => void }).unref();
    }

    this.jobs.set(job.name, {
      ...job,
      nextRunAt: job.enabled ? new Date(Date.now() + (job.intervalMs ?? 0)) : null,
      handle,
    });
  }

  private async run(name: string): Promise<void> {
    const job = this.jobs.get(name);
    if (!job || !job.enabled) return;

    job.lastRunAt = new Date();
    job.nextRunAt = job.intervalMs ? new Date(Date.now() + job.intervalMs) : null;

    try {
      await job.handler();
    } catch {
      // Scheduler swallows errors — individual handlers should log
    }
  }

  async trigger(name: string): Promise<void> {
    await this.run(name);
  }

  enable(name: string): void {
    const job = this.jobs.get(name);
    if (!job) return;
    job.enabled = true;
    if (job.intervalMs && !job.handle) {
      const handle = setInterval(async () => {
        await this.run(name);
      }, job.intervalMs);
      if (typeof (handle as unknown as { unref?: () => void }).unref === "function") {
        (handle as unknown as { unref: () => void }).unref();
      }
      job.handle = handle;
    }
  }

  disable(name: string): void {
    const job = this.jobs.get(name);
    if (!job) return;
    job.enabled = false;
    if (job.handle !== null) {
      clearInterval(job.handle);
      job.handle = null;
    }
  }

  getJobs(): Array<Omit<ScheduledJob, "handler">> {
    return Array.from(this.jobs.values()).map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ handler: _h, handle: _handle, ...rest }) => rest
    );
  }
}

export const scheduler = new CronScheduler();
