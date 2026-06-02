// FILE: src/modules/housekeeping/dto/index.ts
import { z } from "zod";

// ─── Enum schemas ─────────────────────────────────────────────────────────────

const HousekeepingTaskTypeEnum = z.enum([
  "STANDARD_CLEANING",
  "DEEP_CLEANING",
  "TURNDOWN",
  "INSPECTION",
  "LINEN_CHANGE",
  "BATHROOM_CLEANING",
  "CHECKOUT_CLEANING",
]);

const HousekeepingPriorityEnum = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

const HousekeepingTaskStatusEnum = z.enum([
  "PENDING",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "VERIFIED",
]);

// Allowed statuses when calling updateTaskStatus endpoint (cannot set directly to PENDING via this DTO)
const UpdateableTaskStatusEnum = z.enum([
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "VERIFIED",
]);

// ─── CreateHousekeepingTaskDto ─────────────────────────────────────────────────

export const CreateHousekeepingTaskDto = z.object({
  hotelId: z.string().uuid("Invalid hotel ID"),
  roomId: z.string().uuid("Invalid room ID"),
  taskType: HousekeepingTaskTypeEnum,
  priority: HousekeepingPriorityEnum.default("NORMAL").optional(),
  scheduledAt: z
    .string()
    .datetime({ message: "scheduledAt must be an ISO datetime string" })
    .optional(),
  assignedTo: z.string().uuid("Invalid assignee ID").optional(),
  notes: z.string().max(1000, "Notes must not exceed 1000 characters").optional(),
});

// ─── UpdateHousekeepingTaskDto ─────────────────────────────────────────────────

export const UpdateHousekeepingTaskDto = z.object({
  priority: HousekeepingPriorityEnum.optional(),
  scheduledAt: z.string().optional(),
  assignedTo: z.string().uuid("Invalid assignee ID").nullable().optional(),
  notes: z.string().optional(),
});

// ─── AssignTaskDto ────────────────────────────────────────────────────────────

export const AssignTaskDto = z.object({
  assignedTo: z.string().uuid("Invalid assignee ID"),
});

// ─── UpdateTaskStatusDto ──────────────────────────────────────────────────────

export const UpdateTaskStatusDto = z.object({
  taskStatus: UpdateableTaskStatusEnum,
  notes: z.string().optional(),
});

// ─── HousekeepingTaskFilterDto ────────────────────────────────────────────────

export const HousekeepingTaskFilterDto = z.object({
  hotelId: z.string().uuid("Invalid hotel ID"),
  roomId: z.string().uuid("Invalid room ID").optional(),
  assignedTo: z.string().uuid("Invalid assignee ID").optional(),
  taskType: HousekeepingTaskTypeEnum.optional(),
  priority: HousekeepingPriorityEnum.optional(),
  taskStatus: HousekeepingTaskStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── RoomStatusFilterDto ──────────────────────────────────────────────────────

export const RoomStatusFilterDto = z.object({
  hotelId: z.string().uuid("Invalid hotel ID"),
  floor: z.coerce.number().int().optional(),
  housekeepingStatus: z
    .enum(["CLEAN", "DIRTY", "INSPECTED", "IN_PROGRESS", "OUT_OF_SERVICE"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreateHousekeepingTaskDtoType = z.infer<typeof CreateHousekeepingTaskDto>;
export type UpdateHousekeepingTaskDtoType = z.infer<typeof UpdateHousekeepingTaskDto>;
export type AssignTaskDtoType = z.infer<typeof AssignTaskDto>;
export type UpdateTaskStatusDtoType = z.infer<typeof UpdateTaskStatusDto>;
export type HousekeepingTaskFilterDtoType = z.infer<typeof HousekeepingTaskFilterDto>;
export type RoomStatusFilterDtoType = z.infer<typeof RoomStatusFilterDto>;
