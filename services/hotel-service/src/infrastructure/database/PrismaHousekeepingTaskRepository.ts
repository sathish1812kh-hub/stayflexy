import type { PrismaClient, Prisma } from '@prisma/client'
import { buildPaginationMeta } from '@stayflexi/shared-types'
import type { PaginatedResult } from '@stayflexi/shared-types'
import { fromPrismaError } from '@stayflexi/shared-errors'
import { HousekeepingTask } from '../../domain/entities/HousekeepingTask'
import type { HousekeepingTaskProps } from '../../domain/entities/HousekeepingTask'
import type {
  IHousekeepingTaskRepository,
  CreateHousekeepingTaskData,
  UpdateHousekeepingTaskData,
  HousekeepingTaskFilter,
} from '../../domain/repositories/IHousekeepingTaskRepository'

type PrismaTask = Prisma.HousekeepingTaskGetPayload<Record<string, never>>

function toDomain(raw: PrismaTask): HousekeepingTask {
  const r = raw as unknown as HousekeepingTaskProps
  return new HousekeepingTask({
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    roomId: r.roomId,
    assignedTo: r.assignedTo ?? null,
    taskType: r.taskType,
    priority: r.priority,
    taskStatus: r.taskStatus,
    scheduledAt: r.scheduledAt ?? null,
    startedAt: r.startedAt ?? null,
    completedAt: r.completedAt ?? null,
    notes: r.notes ?? null,
    createdById: r.createdById,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  })
}

export class PrismaHousekeepingTaskRepository implements IHousekeepingTaskRepository {
  constructor(private readonly db: PrismaClient) {}

  private get delegate(): {
    findUnique: (a: unknown) => Promise<PrismaTask | null>
    findMany: (a: unknown) => Promise<PrismaTask[]>
    count: (a: unknown) => Promise<number>
    create: (a: unknown) => Promise<PrismaTask>
    update: (a: unknown) => Promise<PrismaTask>
    delete: (a: unknown) => Promise<PrismaTask>
  } {
    return (this.db as unknown as Record<string, unknown>)['housekeepingTask'] as unknown as {
      findUnique: (a: unknown) => Promise<PrismaTask | null>
      findMany: (a: unknown) => Promise<PrismaTask[]>
      count: (a: unknown) => Promise<number>
      create: (a: unknown) => Promise<PrismaTask>
      update: (a: unknown) => Promise<PrismaTask>
      delete: (a: unknown) => Promise<PrismaTask>
    }
  }

  async findById(id: string): Promise<HousekeepingTask | null> {
    try {
      const raw = await this.delegate.findUnique({ where: { id } })
      return raw ? toDomain(raw) : null
    } catch (err) {
      const m = fromPrismaError(err)
      if (m) throw m
      throw err
    }
  }

  async create(data: CreateHousekeepingTaskData): Promise<HousekeepingTask> {
    try {
      const raw = await this.delegate.create({ data })
      return toDomain(raw)
    } catch (err) {
      const m = fromPrismaError(err)
      if (m) throw m
      throw err
    }
  }

  async update(id: string, data: UpdateHousekeepingTaskData): Promise<HousekeepingTask> {
    try {
      const raw = await this.delegate.update({ where: { id }, data })
      return toDomain(raw)
    } catch (err) {
      const m = fromPrismaError(err)
      if (m) throw m
      throw err
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.delegate.delete({ where: { id } })
    } catch (err) {
      const m = fromPrismaError(err)
      if (m) throw m
      throw err
    }
  }

  async findMany(
    organizationId: string,
    filter: HousekeepingTaskFilter,
  ): Promise<PaginatedResult<HousekeepingTask>> {
    const where: Record<string, unknown> = { organizationId }
    if (filter.hotelId) where['hotelId'] = filter.hotelId
    if (filter.roomId) where['roomId'] = filter.roomId
    if (filter.assignedTo) where['assignedTo'] = filter.assignedTo
    if (filter.taskStatus) where['taskStatus'] = filter.taskStatus
    if (filter.priority) where['priority'] = filter.priority

    const [rows, total] = await Promise.all([
      this.delegate.findMany({
        where,
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.delegate.count({ where }),
    ])
    return { data: rows.map(toDomain), meta: buildPaginationMeta(total, filter.page, filter.limit) }
  }
}
