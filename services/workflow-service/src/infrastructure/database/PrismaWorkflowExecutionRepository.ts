import { getPrismaClient, Prisma } from '@stayflexi/shared-database'
import { fromPrismaError } from '@stayflexi/shared-errors'
import type { PrismaClient, WorkflowExecutionStatus } from '@prisma/client'
import { WorkflowExecution } from '../../domain/entities/WorkflowExecution'
import type { WorkflowExecutionProps } from '../../domain/entities/WorkflowExecution'
import type {
  IWorkflowExecutionRepository,
  WorkflowFilters,
  CreateWorkflowExecutionData,
  UpdateWorkflowData,
} from '../../domain/repositories/IWorkflowExecutionRepository'

type PrismaWorkflowExecution = {
  id: string
  workflowName: string
  automationRuleId: string | null
  executionStatus: string
  triggerSource: string
  executionPayload: unknown
  resultPayload: unknown
  retryCount: number
  idempotencyKey: string | null
  startedAt: Date | null
  completedAt: Date | null
  failureReason: string | null
  organizationId: string
  hotelId: string | null
  createdAt: Date
  updatedAt: Date
}

function mapToEntity(r: PrismaWorkflowExecution): WorkflowExecution {
  const props: WorkflowExecutionProps = {
    id: r.id,
    workflowName: r.workflowName,
    automationRuleId: r.automationRuleId,
    executionStatus: r.executionStatus,
    triggerSource: r.triggerSource,
    executionPayload: r.executionPayload,
    resultPayload: r.resultPayload,
    retryCount: r.retryCount,
    idempotencyKey: r.idempotencyKey,
    startedAt: r.startedAt,
    completedAt: r.completedAt,
    failureReason: r.failureReason,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
  return new WorkflowExecution(props)
}

export class PrismaWorkflowExecutionRepository
  implements IWorkflowExecutionRepository {
  private readonly db: PrismaClient

  constructor(db?: PrismaClient) {
    this.db = db ?? getPrismaClient()
  }

  async findById(id: string): Promise<WorkflowExecution | null> {
    try {
      const r = await this.db.workflowExecution.findUnique({ where: { id } })
      return r ? mapToEntity(r) : null
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async findByIdempotencyKey(key: string): Promise<WorkflowExecution | null> {
    try {
      const r = await this.db.workflowExecution.findUnique({
        where: { idempotencyKey: key },
      })
      return r ? mapToEntity(r) : null
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async findByOrganization(
    organizationId: string,
    filters?: WorkflowFilters,
  ): Promise<{ data: WorkflowExecution[]; total: number }> {
    try {
      const page = filters?.page ?? 1
      const limit = filters?.limit ?? 20
      const skip = (Math.max(1, page) - 1) * Math.max(1, limit)

      const where = {
        organizationId,
        ...(filters?.hotelId !== undefined && { hotelId: filters.hotelId }),
        ...(filters?.executionStatus !== undefined && {
          executionStatus: filters.executionStatus as WorkflowExecutionStatus,
        }),
        ...(filters?.triggerSource !== undefined && {
          triggerSource: filters.triggerSource,
        }),
        ...(filters?.workflowName !== undefined && {
          workflowName: filters.workflowName,
        }),
      }

      const [records, total] = await Promise.all([
        this.db.workflowExecution.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.db.workflowExecution.count({ where }),
      ])

      return { data: records.map(mapToEntity), total }
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async findPendingRetries(): Promise<WorkflowExecution[]> {
    try {
      const records = await this.db.workflowExecution.findMany({
        where: {
          executionStatus: 'FAILED' as WorkflowExecutionStatus,
          retryCount: { lt: 3 },
        },
        orderBy: { createdAt: 'asc' },
      })
      return records.map(mapToEntity)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async create(data: CreateWorkflowExecutionData): Promise<WorkflowExecution> {
    try {
      const r = await this.db.workflowExecution.create({
        data: {
          workflowName: data.workflowName,
          automationRuleId: data.automationRuleId ?? null,
          triggerSource: data.triggerSource,
          executionStatus: 'PENDING' as WorkflowExecutionStatus,
          executionPayload:
            data.executionPayload !== undefined
              ? (data.executionPayload as Prisma.InputJsonValue)
              : undefined,
          idempotencyKey: data.idempotencyKey ?? null,
          organizationId: data.organizationId,
          hotelId: data.hotelId ?? null,
          retryCount: 0,
        },
      })
      return mapToEntity(r)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async updateStatus(
    id: string,
    status: string,
    data?: UpdateWorkflowData,
  ): Promise<WorkflowExecution> {
    try {
      const r = await this.db.workflowExecution.update({
        where: { id },
        data: {
          executionStatus: status as WorkflowExecutionStatus,
          ...(data?.startedAt !== undefined && { startedAt: data.startedAt }),
          ...(data?.completedAt !== undefined && {
            completedAt: data.completedAt,
          }),
          ...(data?.failureReason !== undefined && {
            failureReason: data.failureReason,
          }),
          ...(data?.resultPayload !== undefined && {
            resultPayload: data.resultPayload as Prisma.InputJsonValue,
          }),
        },
      })
      return mapToEntity(r)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async incrementRetry(id: string): Promise<WorkflowExecution> {
    try {
      const r = await this.db.workflowExecution.update({
        where: { id },
        data: {
          retryCount: { increment: 1 },
          executionStatus: 'RETRYING' as WorkflowExecutionStatus,
        },
      })
      return mapToEntity(r)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }
}
