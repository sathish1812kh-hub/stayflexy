export interface IWorker {
  readonly name: string;
  readonly concurrency: number;
  execute(context: WorkerContext): Promise<WorkerResult>;
  onComplete?(result: WorkerResult): Promise<void>;
  onError?(error: Error, context: WorkerContext): Promise<void>;
}

export interface WorkerContext {
  jobId: string;
  jobName: string;
  data: Record<string, unknown>;
  attempt: number;
  correlationId?: string;
}

export interface WorkerResult {
  success: boolean;
  itemsProcessed?: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

export type WorkerStatus = "idle" | "running" | "stopped" | "error";

export interface WorkerState {
  name: string;
  status: WorkerStatus;
  lastRunAt: Date | null;
  lastResult: WorkerResult | null;
  totalRuns: number;
  failedRuns: number;
}
