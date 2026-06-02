export type BackgroundJobStatusType =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "DEAD_LETTER";

export interface BackgroundJob {
  id: string;
  jobType: string;
  jobStatus: BackgroundJobStatusType;
  payload: Record<string, unknown> | null;
  retryCount: number;
  maxRetries: number;
  idempotencyKey: string | null;
  scheduledAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  failedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBackgroundJobData {
  jobType: string;
  payload?: Record<string, unknown>;
  maxRetries?: number;
  idempotencyKey?: string;
  scheduledAt?: Date;
}

export interface UpdateBackgroundJobData {
  jobStatus?: BackgroundJobStatusType;
  retryCount?: number;
  startedAt?: Date;
  completedAt?: Date;
  failedReason?: string;
}

export interface JobFilter {
  jobType?: string;
  jobStatus?: BackgroundJobStatusType;
  page?: number;
  limit?: number;
}

export interface JobHandler {
  readonly jobType: string;
  execute(job: BackgroundJob): Promise<void>;
}

export interface JobResult {
  success: boolean;
  message?: string;
}
