// FILE: src/modules/automation/repositories/PrismaWorkflowExecutionRepository.ts
import { Prisma } from "@prisma/client";
import { BaseRepository } from "@lib/baseRepository";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type {
  WorkflowExecution,
  CreateWorkflowExecutionData,
  ExecutionFilter,
  WorkflowExecutionStatusType,
} from "../types";

type PrismaExecution = Prisma.WorkflowExecutionGetPayload<Record<string, never>>;

function toExecution(r: PrismaExecution): WorkflowExecution {
  return {
    id: r.id,
    workflowName: r.workflowName,
    automationRuleId: r.automationRuleId,
    executionStatus: r.executionStatus as WorkflowExecutionStatusType,
    triggerSource: r.triggerSource,
    executionPayload: r.executionPayload != null
      ? (r.executionPayload as Record<string, unknown>)
      : null,
    resultPayload: r.resultPayload != null
      ? (r.resultPayload as Record<string, unknown>)
      : null,
    retryCount: r.retryCount,
    idempotencyKey: r.idempotencyKey,
    startedAt: r.startedAt,
    completedAt: r.completedAt,
    failureReason: r.failureReason,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaWorkflowExecutionRepository extends BaseRepository<
  WorkflowExecution,
  CreateWorkflowExecutionData,
  Record<string, never>
> {
  async findById(id: string): Promise<Nullable<WorkflowExecution>> {
    const r = await this.db.workflowExecution.findFirst({ where: { id } });
    return r ? toExecution(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<WorkflowExecution>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.workflowExecution.findMany({
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.workflowExecution.count(),
    ]);
    return {
      data: records.map(toExecution),
      meta: this.buildPaginationMeta(total, params),
    };
  }

  async findManyFiltered(
    filter: ExecutionFilter
  ): Promise<PaginatedResult<WorkflowExecution>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const params: PaginationParams = { page, limit };
    const skip = this.buildSkip(params);

    const where: Prisma.WorkflowExecutionWhereInput = {
      ...(filter.organizationId && { organizationId: filter.organizationId }),
      ...(filter.hotelId && { hotelId: filter.hotelId }),
      ...(filter.workflowName && { workflowName: filter.workflowName }),
      ...(filter.executionStatus && {
        executionStatus: filter.executionStatus as PrismaExecution["executionStatus"],
      }),
    };

    const [records, total] = await Promise.all([
      this.db.workflowExecution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.workflowExecution.count({ where }),
    ]);

    return {
      data: records.map(toExecution),
      meta: this.buildPaginationMeta(total, params),
    };
  }

  async findByIdempotencyKey(key: string): Promise<Nullable<WorkflowExecution>> {
    const r = await this.db.workflowExecution.findUnique({
      where: { idempotencyKey: key },
    });
    return r ? toExecution(r) : null;
  }

  async create(data: CreateWorkflowExecutionData): Promise<WorkflowExecution> {
    const r = await this.db.workflowExecution.create({
      data: {
        workflowName: data.workflowName,
        automationRuleId: data.automationRuleId ?? null,
        executionStatus: "PENDING",
        triggerSource: data.triggerSource,
        executionPayload: data.executionPayload != null
          ? (data.executionPayload as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        resultPayload: Prisma.JsonNull,
        retryCount: 0,
        idempotencyKey: data.idempotencyKey ?? null,
        organizationId: data.organizationId,
        hotelId: data.hotelId ?? null,
      },
    });
    return toExecution(r);
  }

  // Executions are append-only — direct updates are not permitted
  async update(_id: string, _data: Record<string, never>): Promise<WorkflowExecution> {
    throw new Error("WorkflowExecutions are append-only");
  }

  async updateStatus(
    id: string,
    status: WorkflowExecutionStatusType,
    extra?: {
      startedAt?: Date;
      completedAt?: Date;
      failureReason?: string;
      retryCount?: number;
      resultPayload?: Record<string, unknown>;
    }
  ): Promise<WorkflowExecution> {
    const data: Prisma.WorkflowExecutionUpdateInput = {
      executionStatus: status as PrismaExecution["executionStatus"],
    };
    if (extra?.startedAt !== undefined) data.startedAt = extra.startedAt;
    if (extra?.completedAt !== undefined) data.completedAt = extra.completedAt;
    if (extra?.failureReason !== undefined) data.failureReason = extra.failureReason;
    if (extra?.retryCount !== undefined) data.retryCount = extra.retryCount;
    if (extra?.resultPayload !== undefined)
      data.resultPayload = extra.resultPayload as Prisma.InputJsonValue;

    const r = await this.db.workflowExecution.update({ where: { id }, data });
    return toExecution(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.workflowExecution.delete({ where: { id } });
  }
}
