import type { IWorker, WorkerContext, WorkerState } from "../types";
import { prisma } from "@lib/prisma";
import { type Prisma } from "@prisma/client";

export class WorkerRegistry {
  private readonly workers = new Map<string, IWorker>();
  private readonly state = new Map<string, WorkerState>();

  register(worker: IWorker): void {
    this.workers.set(worker.name, worker);
    this.state.set(worker.name, {
      name: worker.name,
      status: "idle",
      lastRunAt: null,
      lastResult: null,
      totalRuns: 0,
      failedRuns: 0,
    });
  }

  getWorker(name: string): IWorker | null {
    return this.workers.get(name) ?? null;
  }

  getState(name: string): WorkerState | null {
    return this.state.get(name) ?? null;
  }

  getAllStates(): WorkerState[] {
    return Array.from(this.state.values());
  }

  async execute(workerName: string, context: WorkerContext): Promise<void> {
    const worker = this.workers.get(workerName);
    if (!worker) throw new Error(`Worker not registered: ${workerName}`);

    const workerState = this.state.get(workerName);
    if (workerState) {
      workerState.status = "running";
      workerState.lastRunAt = new Date();
      workerState.totalRuns++;
    }

    const startedAt = new Date();
    const execution = await prisma.workerExecution.create({
      data: { workerName, executionStatus: "RUNNING", startedAt },
    });

    try {
      const result = await worker.execute(context);
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();

      await prisma.workerExecution.update({
        where: { id: execution.id },
        data: {
          executionStatus: "COMPLETED",
          completedAt,
          durationMs,
          itemsProcessed: result.itemsProcessed ?? null,
          metadata: result.metadata as Prisma.InputJsonValue | undefined,
        },
      });

      if (workerState) {
        workerState.status = "idle";
        workerState.lastResult = result;
      }

      await worker.onComplete?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();

      await prisma.workerExecution.update({
        where: { id: execution.id },
        data: {
          executionStatus: "FAILED",
          completedAt,
          durationMs,
          failedReason: error.message,
        },
      });

      if (workerState) {
        workerState.status = "error";
        workerState.failedRuns++;
      }

      await worker.onError?.(error, context);
    }
  }
}

export const workerRegistry = new WorkerRegistry();
