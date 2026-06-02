import type { Prisma } from "@prisma/client";
import { BaseService } from "@lib/baseService";
import { prisma } from "@lib/prisma";
import { NotFoundError, ConflictError, ForbiddenError } from "@errors/HttpError";
import type { PrismaOperationalTaskRepository } from "../repositories/PrismaOperationalTaskRepository";
import type {
  OperationalTask,
  OperationalTaskFilter,
  WorkloadSummary,
  StaffWorkload,
} from "../types";
import type {
  CreateOperationalTaskDtoType,
  UpdateOperationalTaskDtoType,
  UpdateOperationalTaskStatusDtoType,
  OperationalTaskFilterDtoType,
  WorkloadQueryDtoType,
} from "../dto";
import { OPERATIONS_ERRORS, VALID_TASK_TRANSITIONS } from "../constants";
import type { PaginatedResult } from "@shared-types";

export class OperationsService extends BaseService {
  protected readonly moduleName = "OperationsService";

  constructor(private readonly taskRepo: PrismaOperationalTaskRepository) {
    super();
  }

  private async validateHotelAccess(hotelId: string, orgId: string): Promise<void> {
    const hotel = await prisma.hotel.findFirst({
      where: { id: hotelId, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!hotel) throw new ForbiddenError(OPERATIONS_ERRORS.HOTEL_NOT_FOUND);
  }

  private async validateTaskAccess(id: string, orgId: string): Promise<OperationalTask> {
    const task = await this.taskRepo.findById(id);
    if (!task) throw new NotFoundError(OPERATIONS_ERRORS.TASK_NOT_FOUND);
    if (task.organizationId !== orgId) throw new ForbiddenError(OPERATIONS_ERRORS.ACCESS_DENIED);
    return task;
  }

  private async writeAudit(
    orgId: string,
    hotelId: string,
    entityId: string,
    eventType: string,
    performedBy: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await prisma.operationalAudit.create({
      data: {
        organizationId: orgId,
        hotelId,
        entityType: "OperationalTask",
        entityId,
        eventType,
        performedBy,
        eventMetadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async createTask(
    dto: CreateOperationalTaskDtoType,
    userId: string,
    orgId: string
  ): Promise<OperationalTask> {
    return this.execute("createTask", async () => {
      await this.validateHotelAccess(dto.hotelId, orgId);

      const task = await this.taskRepo.create({
        organizationId: orgId,
        hotelId: dto.hotelId,
        taskTitle: dto.taskTitle,
        taskDescription: dto.taskDescription,
        taskCategory: dto.taskCategory,
        priority: dto.priority,
        assignedTo: dto.assignedTo,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        createdById: userId,
      });

      await this.writeAudit(orgId, dto.hotelId, task.id, "TASK_CREATED", userId, {
        taskCategory: dto.taskCategory,
        priority: dto.priority ?? "NORMAL",
      });

      return task;
    });
  }

  async updateTask(
    id: string,
    dto: UpdateOperationalTaskDtoType,
    userId: string,
    orgId: string
  ): Promise<OperationalTask> {
    return this.execute("updateTask", async () => {
      const task = await this.validateTaskAccess(id, orgId);

      if (task.taskStatus === "COMPLETED" || task.taskStatus === "CANCELLED") {
        throw new ConflictError(OPERATIONS_ERRORS.TASK_IMMUTABLE);
      }

      const updated = await this.taskRepo.update(id, {
        taskTitle: dto.taskTitle,
        taskDescription: dto.taskDescription ?? undefined,
        taskCategory: dto.taskCategory,
        priority: dto.priority,
        assignedTo: dto.assignedTo ?? undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : dto.dueDate === null ? null : undefined,
      });

      await this.writeAudit(orgId, task.hotelId, id, "TASK_UPDATED", userId);

      return updated;
    });
  }

  async updateTaskStatus(
    id: string,
    dto: UpdateOperationalTaskStatusDtoType,
    userId: string,
    orgId: string
  ): Promise<OperationalTask> {
    return this.execute("updateTaskStatus", async () => {
      const task = await this.validateTaskAccess(id, orgId);

      const allowed = VALID_TASK_TRANSITIONS[task.taskStatus] ?? [];
      if (!allowed.includes(dto.taskStatus)) {
        throw new ConflictError(OPERATIONS_ERRORS.INVALID_TRANSITION);
      }

      const updated = await this.taskRepo.updateStatus(id, dto.taskStatus);

      await this.writeAudit(orgId, task.hotelId, id, "TASK_STATUS_UPDATED", userId, {
        from: task.taskStatus,
        to: dto.taskStatus,
      });

      return updated;
    });
  }

  async getTask(id: string, orgId: string): Promise<OperationalTask> {
    return this.execute("getTask", async () => {
      return this.validateTaskAccess(id, orgId);
    });
  }

  async listTasks(
    filter: OperationalTaskFilterDtoType,
    orgId: string
  ): Promise<PaginatedResult<OperationalTask>> {
    return this.execute("listTasks", async () => {
      await this.validateHotelAccess(filter.hotelId, orgId);

      const taskFilter: OperationalTaskFilter = {
        organizationId: orgId,
        hotelId: filter.hotelId,
        assignedTo: filter.assignedTo,
        taskCategory: filter.taskCategory,
        priority: filter.priority,
        taskStatus: filter.taskStatus,
        page: filter.page,
        limit: filter.limit,
      };

      return this.taskRepo.findManyFiltered(taskFilter);
    });
  }

  async getStaffWorkload(dto: WorkloadQueryDtoType, orgId: string): Promise<WorkloadSummary> {
    return this.execute("getStaffWorkload", async () => {
      await this.validateHotelAccess(dto.hotelId, orgId);

      const tasks = await prisma.operationalTask.findMany({
        where: { hotelId: dto.hotelId, organizationId: orgId },
        select: { assignedTo: true, taskStatus: true, dueDate: true },
      });

      const now = new Date();
      const staffMap = new Map<string, StaffWorkload>();
      let unassigned = 0;

      for (const t of tasks) {
        if (!t.assignedTo) {
          if (t.taskStatus === "PENDING" || t.taskStatus === "IN_PROGRESS") unassigned++;
          continue;
        }

        const existing = staffMap.get(t.assignedTo) ?? {
          assignedTo: t.assignedTo,
          pending: 0,
          inProgress: 0,
          completed: 0,
          total: 0,
          overdue: 0,
        };

        existing.total++;
        if (t.taskStatus === "PENDING") existing.pending++;
        else if (t.taskStatus === "IN_PROGRESS") existing.inProgress++;
        else if (t.taskStatus === "COMPLETED") existing.completed++;

        const isActive = t.taskStatus === "PENDING" || t.taskStatus === "IN_PROGRESS";
        if (isActive && t.dueDate && t.dueDate < now) existing.overdue++;

        staffMap.set(t.assignedTo, existing);
      }

      return {
        hotelId: dto.hotelId,
        asOf: now,
        staff: Array.from(staffMap.values()),
        unassigned,
      };
    });
  }
}
