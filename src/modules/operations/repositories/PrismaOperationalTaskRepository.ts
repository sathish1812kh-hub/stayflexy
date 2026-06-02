import { type Prisma } from "@prisma/client";
import { BaseRepository, type PrismaTransactionClient } from "@lib/baseRepository";
import type { PaginatedResult, PaginationParams } from "@shared-types";
import type {
  OperationalTask,
  CreateOperationalTaskData,
  UpdateOperationalTaskData,
  OperationalTaskFilter,
  OperationalTaskCategoryType,
  OperationalTaskStatusType,
  HousekeepingPriorityType,
} from "../types";

type PrismaTaskRecord = Prisma.OperationalTaskGetPayload<Record<string, never>>;

function toTask(r: PrismaTaskRecord): OperationalTask {
  return {
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    taskTitle: r.taskTitle,
    taskDescription: r.taskDescription ?? null,
    taskCategory: r.taskCategory as OperationalTaskCategoryType,
    priority: r.priority as HousekeepingPriorityType,
    assignedTo: r.assignedTo ?? null,
    taskStatus: r.taskStatus as OperationalTaskStatusType,
    dueDate: r.dueDate ?? null,
    completedAt: r.completedAt ?? null,
    createdById: r.createdById,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaOperationalTaskRepository extends BaseRepository<
  OperationalTask,
  CreateOperationalTaskData,
  UpdateOperationalTaskData
> {
  async findById(id: string): Promise<OperationalTask | null> {
    const r = await this.db.operationalTask.findFirst({ where: { id } });
    return r ? toTask(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<OperationalTask>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.operationalTask.findMany({ skip, take: params.limit, orderBy: { createdAt: "desc" } }),
      this.db.operationalTask.count(),
    ]);
    return { data: records.map(toTask), meta: this.buildPaginationMeta(total, params) };
  }

  async findManyFiltered(filter: OperationalTaskFilter): Promise<PaginatedResult<OperationalTask>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const params: PaginationParams = { page, limit };
    const skip = this.buildSkip(params);

    const where: Prisma.OperationalTaskWhereInput = {
      ...(filter.organizationId && { organizationId: filter.organizationId }),
      ...(filter.hotelId && { hotelId: filter.hotelId }),
      ...(filter.assignedTo && { assignedTo: filter.assignedTo }),
      ...(filter.taskCategory && { taskCategory: filter.taskCategory as PrismaTaskRecord["taskCategory"] }),
      ...(filter.priority && { priority: filter.priority as PrismaTaskRecord["priority"] }),
      ...(filter.taskStatus && { taskStatus: filter.taskStatus as PrismaTaskRecord["taskStatus"] }),
    };

    const [records, total] = await Promise.all([
      this.db.operationalTask.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      this.db.operationalTask.count({ where }),
    ]);
    return { data: records.map(toTask), meta: this.buildPaginationMeta(total, params) };
  }

  async create(data: CreateOperationalTaskData): Promise<OperationalTask> {
    const r = await this.db.operationalTask.create({
      data: {
        organizationId: data.organizationId,
        hotelId: data.hotelId,
        taskTitle: data.taskTitle,
        taskDescription: data.taskDescription ?? null,
        taskCategory: data.taskCategory as PrismaTaskRecord["taskCategory"],
        priority: (data.priority ?? "NORMAL") as PrismaTaskRecord["priority"],
        assignedTo: data.assignedTo ?? null,
        dueDate: data.dueDate ?? null,
        createdById: data.createdById,
      },
    });
    return toTask(r);
  }

  async update(id: string, data: UpdateOperationalTaskData): Promise<OperationalTask> {
    const payload: Prisma.OperationalTaskUpdateInput = {};
    if (data.taskTitle !== undefined) payload.taskTitle = data.taskTitle;
    if (data.taskDescription !== undefined) payload.taskDescription = data.taskDescription;
    if (data.taskCategory !== undefined) payload.taskCategory = data.taskCategory as PrismaTaskRecord["taskCategory"];
    if (data.priority !== undefined) payload.priority = data.priority as PrismaTaskRecord["priority"];
    if (data.assignedTo !== undefined) payload.assignedTo = data.assignedTo;
    if (data.taskStatus !== undefined) payload.taskStatus = data.taskStatus as PrismaTaskRecord["taskStatus"];
    if (data.dueDate !== undefined) payload.dueDate = data.dueDate;
    if (data.completedAt !== undefined) payload.completedAt = data.completedAt;

    const r = await this.db.operationalTask.update({ where: { id }, data: payload });
    return toTask(r);
  }

  async updateStatus(
    id: string,
    status: OperationalTaskStatusType,
    tx?: PrismaTransactionClient
  ): Promise<OperationalTask> {
    const db = tx ?? this.db;
    const payload: Prisma.OperationalTaskUpdateInput = {
      taskStatus: status as PrismaTaskRecord["taskStatus"],
      ...(status === "COMPLETED" ? { completedAt: new Date() } : {}),
    };
    const r = await db.operationalTask.update({ where: { id }, data: payload });
    return toTask(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.operationalTask.delete({ where: { id } });
  }
}
