// FILE: src/modules/housekeeping/services/HousekeepingService.ts
import { BaseService } from "@lib/baseService";
import { prisma } from "@lib/prisma";
import { type PrismaTransactionClient } from "@lib/baseRepository";
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from "@errors/HttpError";
import type { PaginatedResult } from "@shared-types";
import type { PrismaHousekeepingTaskRepository } from "../repositories/PrismaHousekeepingTaskRepository";
import type {
  HousekeepingTask,
  HousekeepingTaskFilter,
  HousekeepingRoomStatus,
} from "../types";
import type {
  CreateHousekeepingTaskDtoType,
  UpdateHousekeepingTaskDtoType,
  AssignTaskDtoType,
  UpdateTaskStatusDtoType,
  HousekeepingTaskFilterDtoType,
  RoomStatusFilterDtoType,
} from "../dto";
import {
  HOUSEKEEPING_ERRORS,
  VALID_TASK_TRANSITIONS,
} from "../constants";

export class HousekeepingService extends BaseService {
  protected readonly moduleName = "HousekeepingService";

  constructor(
    private readonly taskRepo: PrismaHousekeepingTaskRepository
  ) {
    super();
  }

  // ─── createTask ───────────────────────────────────────────────────────────────

  async createTask(
    dto: CreateHousekeepingTaskDtoType,
    userId: string,
    orgId: string
  ): Promise<HousekeepingTask> {
    return this.execute("createTask", async () => {
      // 1. Validate hotel belongs to org
      const hotel = await prisma.hotel.findFirst({
        where: { id: dto.hotelId, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!hotel) throw new NotFoundError(HOUSEKEEPING_ERRORS.HOTEL_NOT_FOUND);

      // 2. Validate room
      const room = await prisma.room.findFirst({
        where: { id: dto.roomId, hotelId: dto.hotelId, deletedAt: null },
        select: { id: true, operationalStatus: true },
      });
      if (!room) throw new NotFoundError(HOUSEKEEPING_ERRORS.ROOM_NOT_FOUND);

      // 3. Reject rooms that are out-of-service
      if (
        room.operationalStatus === "UNDER_MAINTENANCE" ||
        room.operationalStatus === "OUT_OF_ORDER"
      ) {
        throw new ConflictError(HOUSEKEEPING_ERRORS.ROOM_NOT_FOUND);
      }

      // 4. Create task
      const task = await this.taskRepo.create({
        organizationId: orgId,
        hotelId: dto.hotelId,
        roomId: dto.roomId,
        createdById: userId,
        taskType: dto.taskType,
        priority: dto.priority ?? "NORMAL",
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        notes: dto.notes ?? null,
        assignedTo: dto.assignedTo ?? null,
      });

      // 5. Create OperationalAudit
      await prisma.operationalAudit.create({
        data: {
          organizationId: orgId,
          hotelId: dto.hotelId,
          entityType: "HousekeepingTask",
          entityId: task.id,
          eventType: "TASK_CREATED",
          performedBy: userId,
        },
      });

      return task;
    });
  }

  // ─── assignTask ───────────────────────────────────────────────────────────────

  async assignTask(
    id: string,
    dto: AssignTaskDtoType,
    userId: string,
    orgId: string
  ): Promise<HousekeepingTask> {
    return this.execute("assignTask", async () => {
      // 1. Find task + validate org access
      const task = await this.taskRepo.findById(id);
      if (!task) throw new NotFoundError(HOUSEKEEPING_ERRORS.TASK_NOT_FOUND);
      if (task.organizationId !== orgId)
        throw new ForbiddenError(HOUSEKEEPING_ERRORS.HOTEL_NOT_FOUND);

      // 2. Immutability check
      if (task.taskStatus === "COMPLETED" || task.taskStatus === "VERIFIED") {
        throw new ConflictError(HOUSEKEEPING_ERRORS.TASK_IMMUTABLE);
      }

      // 3. Update assignedTo; bump to ASSIGNED if currently PENDING
      const newStatus =
        task.taskStatus === "PENDING" ? "ASSIGNED" : task.taskStatus;

      const updated = await this.taskRepo.update(id, {
        assignedTo: dto.assignedTo,
        taskStatus: newStatus,
      });

      // 4. Audit
      await prisma.operationalAudit.create({
        data: {
          organizationId: orgId,
          hotelId: task.hotelId,
          entityType: "HousekeepingTask",
          entityId: id,
          eventType: "TASK_ASSIGNED",
          performedBy: userId,
        },
      });

      return updated;
    });
  }

  // ─── updateTaskStatus ─────────────────────────────────────────────────────────

  async updateTaskStatus(
    id: string,
    dto: UpdateTaskStatusDtoType,
    userId: string,
    orgId: string
  ): Promise<HousekeepingTask> {
    return this.execute("updateTaskStatus", async () => {
      // 1. Find task + validate org
      const task = await this.taskRepo.findById(id);
      if (!task) throw new NotFoundError(HOUSEKEEPING_ERRORS.TASK_NOT_FOUND);
      if (task.organizationId !== orgId)
        throw new ForbiddenError(HOUSEKEEPING_ERRORS.HOTEL_NOT_FOUND);

      // 2. Check valid transition
      const allowed = VALID_TASK_TRANSITIONS[task.taskStatus] ?? [];
      if (!allowed.includes(dto.taskStatus)) {
        throw new ConflictError(HOUSEKEEPING_ERRORS.INVALID_TRANSITION);
      }

      // 3. Build extra fields
      const now = new Date();
      const extra: { startedAt?: Date; completedAt?: Date; notes?: string } = {};
      if (dto.taskStatus === "IN_PROGRESS") extra.startedAt = now;
      if (dto.taskStatus === "COMPLETED" || dto.taskStatus === "VERIFIED")
        extra.completedAt = now;
      if (dto.notes !== undefined) extra.notes = dto.notes;

      const fromStatus = task.taskStatus;

      // 4. Transaction: update task + room housekeeping status + audit
      const updated = await prisma.$transaction(
        async (tx: PrismaTransactionClient) => {
          const updatedTask = await this.taskRepo.updateStatus(
            id,
            dto.taskStatus,
            extra
          );

          // Update room housekeepingStatus based on new task status
          if (dto.taskStatus === "COMPLETED") {
            await tx.room.update({
              where: { id: task.roomId },
              data: { housekeepingStatus: "CLEAN" },
            });
          } else if (dto.taskStatus === "VERIFIED") {
            await tx.room.update({
              where: { id: task.roomId },
              data: { housekeepingStatus: "INSPECTED" },
            });
          } else if (dto.taskStatus === "IN_PROGRESS") {
            await tx.room.update({
              where: { id: task.roomId },
              data: { housekeepingStatus: "IN_PROGRESS" },
            });
          }

          // Audit
          await tx.operationalAudit.create({
            data: {
              organizationId: orgId,
              hotelId: task.hotelId,
              entityType: "HousekeepingTask",
              entityId: id,
              eventType: "TASK_STATUS_UPDATED",
              performedBy: userId,
              eventMetadata: { from: fromStatus, to: dto.taskStatus },
            },
          });

          return updatedTask;
        }
      );

      return updated;
    });
  }

  // ─── updateTask ───────────────────────────────────────────────────────────────

  async updateTask(
    id: string,
    dto: UpdateHousekeepingTaskDtoType,
    userId: string,
    orgId: string
  ): Promise<HousekeepingTask> {
    return this.execute("updateTask", async () => {
      // 1. Find task + validate org
      const task = await this.taskRepo.findById(id);
      if (!task) throw new NotFoundError(HOUSEKEEPING_ERRORS.TASK_NOT_FOUND);
      if (task.organizationId !== orgId)
        throw new ForbiddenError(HOUSEKEEPING_ERRORS.HOTEL_NOT_FOUND);

      // 2. Immutability check
      if (task.taskStatus === "COMPLETED" || task.taskStatus === "VERIFIED") {
        throw new ConflictError(HOUSEKEEPING_ERRORS.TASK_IMMUTABLE);
      }

      // 3. Build update payload
      const updateData: Parameters<typeof this.taskRepo.update>[1] = {};
      if (dto.notes !== undefined) updateData.notes = dto.notes;
      if (dto.priority !== undefined) updateData.priority = dto.priority;
      if (dto.scheduledAt !== undefined)
        updateData.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
      if (dto.assignedTo !== undefined) updateData.assignedTo = dto.assignedTo ?? null;

      // 4. Auto-promote to ASSIGNED if assignedTo changed and status was PENDING
      const assignedToChanged =
        dto.assignedTo !== undefined && dto.assignedTo !== task.assignedTo;
      if (assignedToChanged && task.taskStatus === "PENDING") {
        updateData.taskStatus = "ASSIGNED";
      }

      const updated = await this.taskRepo.update(id, updateData);

      // Audit
      await prisma.operationalAudit.create({
        data: {
          organizationId: orgId,
          hotelId: task.hotelId,
          entityType: "HousekeepingTask",
          entityId: id,
          eventType: "TASK_UPDATED",
          performedBy: userId,
        },
      });

      return updated;
    });
  }

  // ─── listTasks ────────────────────────────────────────────────────────────────

  async listTasks(
    filter: HousekeepingTaskFilterDtoType,
    orgId: string
  ): Promise<PaginatedResult<HousekeepingTask>> {
    return this.execute("listTasks", async () => {
      // Validate hotel belongs to org
      const hotel = await prisma.hotel.findFirst({
        where: { id: filter.hotelId, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!hotel) throw new NotFoundError(HOUSEKEEPING_ERRORS.HOTEL_NOT_FOUND);

      const taskFilter: HousekeepingTaskFilter = {
        organizationId: orgId,
        hotelId: filter.hotelId,
        ...(filter.roomId && { roomId: filter.roomId }),
        ...(filter.assignedTo && { assignedTo: filter.assignedTo }),
        ...(filter.taskType && { taskType: filter.taskType }),
        ...(filter.priority && { priority: filter.priority }),
        ...(filter.taskStatus && { taskStatus: filter.taskStatus }),
        page: filter.page,
        limit: filter.limit,
      };

      return this.taskRepo.findManyFiltered(taskFilter);
    });
  }

  // ─── getTask ──────────────────────────────────────────────────────────────────

  async getTask(id: string, orgId: string): Promise<HousekeepingTask> {
    return this.execute("getTask", async () => {
      const task = await this.taskRepo.findById(id);
      if (!task) throw new NotFoundError(HOUSEKEEPING_ERRORS.TASK_NOT_FOUND);
      if (task.organizationId !== orgId)
        throw new ForbiddenError(HOUSEKEEPING_ERRORS.HOTEL_NOT_FOUND);
      return task;
    });
  }

  // ─── getRoomStatuses ──────────────────────────────────────────────────────────

  async getRoomStatuses(
    filter: RoomStatusFilterDtoType,
    orgId: string
  ): Promise<HousekeepingRoomStatus[]> {
    return this.execute("getRoomStatuses", async () => {
      // 1. Validate hotel belongs to org
      const hotel = await prisma.hotel.findFirst({
        where: { id: filter.hotelId, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!hotel) throw new NotFoundError(HOUSEKEEPING_ERRORS.HOTEL_NOT_FOUND);

      const page = filter.page ?? 1;
      const limit = filter.limit ?? 50;
      const skip = (page - 1) * limit;

      // 2. Query rooms with pagination + filters
      const rooms = await prisma.room.findMany({
        where: {
          hotelId: filter.hotelId,
          deletedAt: null,
          ...(filter.floor !== undefined && { floor: filter.floor }),
          ...(filter.housekeepingStatus && {
            housekeepingStatus:
              filter.housekeepingStatus as Parameters<
                typeof prisma.room.findMany
              >[0] extends { where?: infer W }
                ? W extends { housekeepingStatus?: infer S }
                  ? S
                  : never
                : never,
          }),
        },
        skip,
        take: limit,
        orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
        select: {
          id: true,
          roomNumber: true,
          floor: true,
          housekeepingStatus: true,
          operationalStatus: true,
        },
      });

      if (rooms.length === 0) return [];

      // 3. Batch-fetch active tasks for all rooms
      const roomIds = rooms.map((r) => r.id);
      const activeTasks = await prisma.housekeepingTask.findMany({
        where: {
          roomId: { in: roomIds },
          taskStatus: { notIn: ["COMPLETED", "VERIFIED"] },
        },
        orderBy: { createdAt: "desc" },
      });

      // Build a map roomId → most-recent active task
      const taskByRoom = new Map<string, HousekeepingTask>();
      for (const raw of activeTasks) {
        if (!taskByRoom.has(raw.roomId)) {
          taskByRoom.set(raw.roomId, {
            id: raw.id,
            organizationId: raw.organizationId,
            hotelId: raw.hotelId,
            roomId: raw.roomId,
            assignedTo: raw.assignedTo ?? null,
            taskType: raw.taskType as HousekeepingTask["taskType"],
            priority: raw.priority as HousekeepingTask["priority"],
            taskStatus: raw.taskStatus as HousekeepingTask["taskStatus"],
            scheduledAt: raw.scheduledAt ?? null,
            startedAt: raw.startedAt ?? null,
            completedAt: raw.completedAt ?? null,
            notes: raw.notes ?? null,
            createdById: raw.createdById,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
          });
        }
      }

      // 4. Assemble result
      return rooms.map((r) => ({
        roomId: r.id,
        roomNumber: r.roomNumber,
        floor: r.floor,
        housekeepingStatus: r.housekeepingStatus as string,
        operationalStatus: r.operationalStatus as string,
        currentTask: taskByRoom.get(r.id) ?? null,
      }));
    });
  }
}
