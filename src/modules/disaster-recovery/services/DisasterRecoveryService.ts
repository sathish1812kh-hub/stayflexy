import { BaseService } from "@lib/baseService";
import { NotFoundError, ConflictError } from "@errors/HttpError";
import type { PaginatedResult } from "@shared-types";
import type { PrismaRecoveryExecutionRepository } from "../repositories/PrismaRecoveryExecutionRepository";
import type { RecoveryExecution } from "../types";
import type { InitiateRecoveryDtoType, RecoveryFilterDtoType } from "../dto";
import { RECOVERY_ERRORS } from "../constants";
import { RecoveryOrchestrator } from "../recovery/RecoveryOrchestrator";

export class DisasterRecoveryService extends BaseService {
  protected readonly moduleName = "DisasterRecoveryService";

  private readonly orchestrator: RecoveryOrchestrator;

  constructor(private readonly repo: PrismaRecoveryExecutionRepository) {
    super();
    this.orchestrator = new RecoveryOrchestrator(repo);
  }

  async initiateRecovery(dto: InitiateRecoveryDtoType, userId: string): Promise<RecoveryExecution> {
    return this.execute("initiateRecovery", async () => {
      const running = await this.repo.findActiveByType(dto.recoveryType);
      if (running) throw new ConflictError(RECOVERY_ERRORS.RECOVERY_ALREADY_RUNNING);

      const execution = await this.repo.create({
        recoveryType: dto.recoveryType,
        backupSnapshotId: dto.backupSnapshotId,
        metadata: dto.metadata,
        initiatedBy: userId,
      });

      this.getLogger().info("Disaster recovery initiated", {
        executionId: execution.id,
        recoveryType: dto.recoveryType,
        initiatedBy: userId,
      });

      // Run async — do not await; caller gets the PENDING execution record immediately
      void this.orchestrator.runRecovery(execution.id, dto.recoveryType).catch((err) => {
        this.getLogger().error(`Recovery orchestration error [${execution.id}]`, err instanceof Error ? err : undefined);
      });

      return execution;
    });
  }

  async getExecution(id: string): Promise<RecoveryExecution> {
    return this.execute("getExecution", async () => {
      const exec = await this.repo.findById(id);
      if (!exec) throw new NotFoundError(RECOVERY_ERRORS.EXECUTION_NOT_FOUND);
      return exec;
    });
  }

  async listExecutions(filter: RecoveryFilterDtoType): Promise<PaginatedResult<RecoveryExecution>> {
    return this.execute("listExecutions", async () => {
      return this.repo.findManyFiltered({
        recoveryType: filter.recoveryType,
        recoveryStatus: filter.recoveryStatus,
        page: filter.page,
        limit: filter.limit,
      });
    });
  }

  async getSystemStatus(): Promise<{
    activeRecovery: RecoveryExecution | null;
    lastRecovery: RecoveryExecution | null;
  }> {
    return this.execute("getSystemStatus", async () => {
      const [activeResult, recentResult] = await Promise.all([
        this.repo.findManyFiltered({ recoveryStatus: "RUNNING", limit: 1 }),
        this.repo.findManyFiltered({ limit: 1 }),
      ]);
      return {
        activeRecovery: activeResult.data[0] ?? null,
        lastRecovery: recentResult.data[0] ?? null,
      };
    });
  }
}
