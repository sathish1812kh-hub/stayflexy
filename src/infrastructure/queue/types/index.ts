export interface QueueJob<T = unknown> {
  id: string;
  name: string;
  data: T;
  opts: JobOptions;
  attempts: number;
  processedAt: Date | null;
  failedReason: string | null;
  status: QueueJobStatus;
  createdAt: Date;
}

export type QueueJobStatus = "waiting" | "active" | "completed" | "failed" | "delayed" | "dead_letter";

export interface JobOptions {
  attempts?: number;      // max retry count (default 3)
  backoff?: BackoffOptions;
  delay?: number;         // ms delay before first processing
  priority?: number;      // higher = processed sooner
  idempotencyKey?: string;
}

export interface BackoffOptions {
  type: "exponential" | "fixed";
  delay: number; // base delay in ms
}

export interface IQueue<T = unknown> {
  add(name: string, data: T, opts?: JobOptions): Promise<QueueJob<T>>;
  process(handler: JobProcessor<T>): void;
  getJob(id: string): Promise<QueueJob<T> | null>;
  getJobs(status: QueueJobStatus): Promise<QueueJob<T>[]>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  size(): Promise<number>;
  getDeadLetterJobs(): Promise<QueueJob<T>[]>;
  retryDeadLetter(id: string): Promise<void>;
}

export type JobProcessor<T> = (job: QueueJob<T>) => Promise<void>;

export interface QueueConfig {
  name: string;
  concurrency?: number;
  defaultJobOptions?: JobOptions;
}
