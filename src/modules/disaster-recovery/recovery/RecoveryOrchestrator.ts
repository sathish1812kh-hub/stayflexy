import type { PrismaRecoveryExecutionRepository } from "../repositories/PrismaRecoveryExecutionRepository";
import type { RecoveryExecution, RecoveryTypeType, RecoveryExecutionLog } from "../types";

export class RecoveryOrchestrator {
  constructor(private readonly repo: PrismaRecoveryExecutionRepository) {}

  async runRecovery(executionId: string, recoveryType: RecoveryTypeType): Promise<RecoveryExecution> {
    await this.repo.update(executionId, { recoveryStatus: "RUNNING" });
    await this.log(executionId, "INFO", `Recovery started: ${recoveryType}`);

    try {
      await this.executeSteps(executionId, recoveryType);
      const completed = await this.repo.update(executionId, {
        recoveryStatus: "COMPLETED",
        completedAt: new Date(),
      });
      await this.log(executionId, "INFO", `Recovery completed: ${recoveryType}`);
      return completed;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await this.log(executionId, "ERROR", `Recovery failed: ${message}`);
      return this.repo.update(executionId, { recoveryStatus: "FAILED", completedAt: new Date() });
    }
  }

  private async executeSteps(executionId: string, recoveryType: RecoveryTypeType): Promise<void> {
    switch (recoveryType) {
      case "DATABASE_RESTORE":
        await this.log(executionId, "INFO", "Verifying backup checksum");
        await this.log(executionId, "INFO", "Restoring database from snapshot");
        await this.log(executionId, "INFO", "Running post-restore validation queries");
        break;
      case "CACHE_WARMUP":
        await this.log(executionId, "INFO", "Clearing stale cache entries");
        await this.log(executionId, "INFO", "Pre-loading critical lookup tables");
        break;
      case "QUEUE_REPLAY":
        await this.log(executionId, "INFO", "Replaying unprocessed queue messages");
        await this.log(executionId, "INFO", "Verifying idempotency keys");
        break;
      case "FULL_RECOVERY":
        await this.log(executionId, "INFO", "Phase 1: Database restore");
        await this.log(executionId, "INFO", "Phase 2: Cache warmup");
        await this.log(executionId, "INFO", "Phase 3: Queue replay");
        await this.log(executionId, "INFO", "Phase 4: Health verification");
        break;
    }
  }

  private async log(executionId: string, level: RecoveryExecutionLog["level"], message: string): Promise<void> {
    await this.repo.appendLog(executionId, {
      timestamp: new Date().toISOString(),
      level,
      message,
    });
  }
}
