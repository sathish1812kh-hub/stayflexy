import type { IQueue, QueueJob, QueueJobStatus, JobOptions, JobProcessor } from "../types";
import { BackoffCalculator } from "../strategies/ExponentialBackoff";
import { DeadLetterStrategy } from "../strategies/DeadLetterStrategy";

function uuid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export class InMemoryQueueAdapter<T = unknown> implements IQueue<T> {
  private readonly jobs = new Map<string, QueueJob<T>>();
  private readonly waiting: string[] = []; // sorted by priority desc
  private readonly idempotencyKeys = new Set<string>();
  private processor: JobProcessor<T> | null = null;
  private paused = false;
  private readonly queueName: string;
  private readonly defaultAttempts: number;

  constructor(queueName: string, defaultAttempts = 3) {
    this.queueName = queueName;
    this.defaultAttempts = defaultAttempts;
  }

  async add(name: string, data: T, opts: JobOptions = {}): Promise<QueueJob<T>> {
    // Idempotency: reject duplicate jobs
    if (opts.idempotencyKey && this.idempotencyKeys.has(opts.idempotencyKey)) {
      const existing = Array.from(this.jobs.values()).find(
        (j) => j.opts.idempotencyKey === opts.idempotencyKey
      );
      if (existing) return existing;
    }

    const job: QueueJob<T> = {
      id: uuid(),
      name,
      data,
      opts: { attempts: this.defaultAttempts, ...opts },
      attempts: 0,
      processedAt: null,
      failedReason: null,
      status: opts.delay ? "delayed" : "waiting",
      createdAt: new Date(),
    };

    this.jobs.set(job.id, job);
    if (opts.idempotencyKey) this.idempotencyKeys.add(opts.idempotencyKey);

    if (opts.delay) {
      setTimeout(() => {
        job.status = "waiting";
        this.insertByPriority(job.id, opts.priority ?? 0);
        void this.tick();
      }, opts.delay);
    } else {
      this.insertByPriority(job.id, opts.priority ?? 0);
      void this.tick();
    }

    return job;
  }

  private insertByPriority(id: string, priority: number): void {
    const job = this.jobs.get(id);
    if (!job) return;
    // Insert maintaining descending priority order
    const idx = this.waiting.findIndex((existingId) => {
      const existing = this.jobs.get(existingId);
      return (existing?.opts.priority ?? 0) < priority;
    });
    if (idx === -1) this.waiting.push(id);
    else this.waiting.splice(idx, 0, id);
  }

  process(handler: JobProcessor<T>): void {
    this.processor = handler;
    void this.tick();
  }

  private async tick(): Promise<void> {
    if (this.paused || !this.processor || this.waiting.length === 0) return;

    const id = this.waiting.shift();
    if (!id) return;

    const job = this.jobs.get(id);
    if (!job) return;

    job.status = "active";
    job.attempts++;
    job.processedAt = new Date();

    try {
      await this.processor(job);
      job.status = "completed";
    } catch (err) {
      job.failedReason = err instanceof Error ? err.message : "Unknown error";
      const maxAttempts = job.opts.attempts ?? this.defaultAttempts;

      if (BackoffCalculator.isRetryable(job.attempts, maxAttempts)) {
        const backoffMs = BackoffCalculator.calculate(
          job.opts.backoff ?? { type: "exponential", delay: 1000 },
          job.attempts
        );
        job.status = "delayed";
        setTimeout(() => {
          job.status = "waiting";
          this.insertByPriority(id, job.opts.priority ?? 0);
          void this.tick();
        }, backoffMs);
      } else {
        job.status = "dead_letter";
        void DeadLetterStrategy.persist(job, this.queueName);
      }
    }

    // Process next job
    void this.tick();
  }

  async getJob(id: string): Promise<QueueJob<T> | null> {
    return this.jobs.get(id) ?? null;
  }

  async getJobs(status: QueueJobStatus): Promise<QueueJob<T>[]> {
    return Array.from(this.jobs.values()).filter((j) => j.status === status);
  }

  async pause(): Promise<void> {
    this.paused = true;
  }

  async resume(): Promise<void> {
    this.paused = false;
    void this.tick();
  }

  async size(): Promise<number> {
    return this.waiting.length;
  }

  async getDeadLetterJobs(): Promise<QueueJob<T>[]> {
    return Array.from(this.jobs.values()).filter((j) => j.status === "dead_letter");
  }

  async retryDeadLetter(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job || job.status !== "dead_letter") return;
    job.status = "waiting";
    job.attempts = 0;
    job.failedReason = null;
    this.insertByPriority(id, job.opts.priority ?? 0);
    void this.tick();
  }
}
