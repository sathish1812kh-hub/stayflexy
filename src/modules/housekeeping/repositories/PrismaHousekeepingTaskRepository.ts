// FILE: src/modules/housekeeping/repositories/PrismaHousekeepingTaskRepository.ts
import { type Prisma } from "@prisma/client";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import { BaseRepository } from "@lib/baseRepository";
import type {
  HousekeepingTask,
  CreateHousekeepingTaskData,
  UpdateHousekeepingTaskData,
  HousekeepingTaskStatusType,
  HousekeepingTaskFilter,
} from "../types";

type PrismaHousekeepingTaskRecord =
  Prisma.HousekeepingTaskGetPayload<Record<string, never>>;

function toTask(r: PrismaHousekeepingTaskRecord): HousekeepingTask {
  return {
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    roomId: r.roomId,
    assignedTo: r.assignedTo ?? null,
    taskType: r.taskType as HousekeepingTask["taskType"],
    priority: r.priority as HousekeepingTask["priority"],
    taskStatus: r.taskStatus as HousekeepingTask["taskStatus"],
    scheduledAt: r.scheduledAt ?? null,
    startedAt: r.startedAt ?? null,
    completedAt: r.completedAt ?? null,
    notes: r.notes ?? null,
    createdById: r.createdById,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaHousekeepingTaskRepository extends BaseRepository<
  HousekeepingTask,
  CreateHousekeepingTaskData,
  UpdateHousekeepingTaskData
> {
  async findById(id: string): Promise<Nullable<HousekeepingTask>> {
    const r = await this.db.housekeepingTask.findFirst({ where: { id } });
    return r ? toTask(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<HousekeepingTask>> {
    const skip = this.buildSkip(params);
    const where: Prisma.HousekeepingTaskWhereInput = {};
    const [records, total] = await Promise.all([
      this.db.housekeepingTask.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.housekeepingTask.count({ where }),
    ]);
    return {
      data: records.map(toTask),
      meta: this.buildPaginationMeta(total, params),
    };
  }

  async findManyFiltered(
    filter: HousekeepingTaskFilter
  ): Promise<PaginatedResult<HousekeepingTask>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const params: PaginationParams = { page, limit };
    const skip = this.buildSkip(params);

    const where: Prisma.HousekeepingTaskWhereInput = {
      ...(filter.organizationId && { organizationId: filter.organizationId }),
      ...(filter.hotelId && { hotelId: filter.hotelId }),
      ...(filter.roomId && { roomId: filter.roomId }),
      ...(filter.assignedTo && { assignedTo: filter.assignedTo }),
      ...(filter.taskType && {
        taskType: filter.taskType as Prisma.EnumHousekeepingTaskTypeFilter["equals"],
      }),
      ...(filter.priority && {
        priority: filter.priority as Prisma.EnumHousekeepingPriorityFilter["equals"],
      }),
      ...(filter.taskStatus && {
        taskStatus: filter.taskStatus as Prisma.EnumHousekeepingTaskStatusFilter["equals"],
      }),
      ...(filter.scheduledAt && {
        scheduledAt: { gte: new Date(filter.scheduledAt) },
      }),
    };

    const [records, total] = await Promise.all([
      this.db.housekeepingTask.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.housekeepingTask.count({ where }),
    ]);

    return {
      data: records.map(toTask),
      meta: this.buildPaginationMeta(total, params),
    };
  }

  async findActiveByRoom(roomId: string): Promise<HousekeepingTask[]> {
    const records = await this.db.housekeepingTask.findMany({
      where: {
        roomId,
        taskStatus: {
          notIn: ["COMPLETED", "VERIFIED"] as PrismaHousekeepingTaskRecord["taskStatus"][],
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return records.map(toTask);
  }

  async create(data: CreateHousekeepingTaskData): Promise<HousekeepingTask> {
    const r = await this.db.housekeepingTask.create({
      data: {
        organizationId: data.organizationId,
        hotelId: data.hotelId,
        roomId: data.roomId,
        assignedTo: data.assignedTo ?? null,
        taskType: data.taskType as PrismaHousekeepingTaskRecord["taskType"],
        priority: (data.priority ?? "NORMAL") as PrismaHousekeepingTaskRecord["priority"],
        taskStatus: "PENDING" as PrismaHousekeepingTaskRecord["taskStatus"],
        scheduledAt: data.scheduledAt ?? null,
        notes: data.notes ?? null,
        createdById: data.createdById,
      },
    });
    return toTask(r);
  }

  async update(id: string, data: UpdateHousekeepingTaskData): Promise<HousekeepingTask> {
    const payload: Prisma.HousekeepingTaskUncheckedUpdateInput = {};

    if (data.assignedTo !== undefined) payload.assignedTo = data.assignedTo;
    if (data.priority !== undefined)
      payload.priority = data.priority as PrismaHousekeepingTaskRecord["priority"];
    if (data.taskStatus !== undefined)
      payload.taskStatus = data.taskStatus as PrismaHousekeepingTaskRecord["taskStatus"];
    if (data.scheduledAt !== undefined) payload.scheduledAt = data.scheduledAt;
    if (data.startedAt !== undefined) payload.startedAt = data.startedAt;
    if (data.completedAt !== undefined) payload.completedAt = data.completedAt;
    if (data.notes !== undefined) payload.notes = data.notes;

    const r = await this.db.housekeepingTask.update({
      where: { id },
      data: payload,
    });
    return toTask(r);
  }

  async updateStatus(
    id: string,
    status: HousekeepingTaskStatusType,
    extra?: { startedAt?: Date; completedAt?: Date; notes?: string }
  ): Promise<HousekeepingTask> {
    const payload: Prisma.HousekeepingTaskUncheckedUpdateInput = {
      taskStatus: status as PrismaHousekeepingTaskRecord["taskStatus"],
    };

    if (extra?.startedAt !== undefined) payload.startedAt = extra.startedAt;
    if (extra?.completedAt !== undefined) payload.completedAt = extra.completedAt;
    if (extra?.notes !== undefined) payload.notes = extra.notes;

    const r = await this.db.housekeepingTask.update({
      where: { id },
      data: payload,
    });
    return toTask(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.housekeepingTask.delete({ where: { id } });
  }
}
