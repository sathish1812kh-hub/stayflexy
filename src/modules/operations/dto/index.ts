import { z } from "zod";

const TaskCategoryEnum = z.enum([
  "FRONT_DESK",
  "CONCIERGE",
  "FOOD_BEVERAGE",
  "GENERAL",
  "MAINTENANCE_FOLLOWUP",
  "GUEST_REQUEST",
  "ADMINISTRATIVE",
]);

const PriorityEnum = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
const TaskStatusEnum = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);

export const CreateOperationalTaskDto = z.object({
  hotelId: z.string().uuid(),
  taskTitle: z.string().min(1).max(255),
  taskDescription: z.string().optional(),
  taskCategory: TaskCategoryEnum,
  priority: PriorityEnum.default("NORMAL"),
  assignedTo: z.string().uuid().optional(),
  dueDate: z.string().optional(),
});
export type CreateOperationalTaskDtoType = z.infer<typeof CreateOperationalTaskDto>;

export const UpdateOperationalTaskDto = z.object({
  taskTitle: z.string().min(1).max(255).optional(),
  taskDescription: z.string().optional(),
  taskCategory: TaskCategoryEnum.optional(),
  priority: PriorityEnum.optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});
export type UpdateOperationalTaskDtoType = z.infer<typeof UpdateOperationalTaskDto>;

export const UpdateOperationalTaskStatusDto = z.object({
  taskStatus: z.enum(["IN_PROGRESS", "COMPLETED", "CANCELLED"]),
});
export type UpdateOperationalTaskStatusDtoType = z.infer<typeof UpdateOperationalTaskStatusDto>;

export const OperationalTaskFilterDto = z.object({
  hotelId: z.string().uuid(),
  assignedTo: z.string().uuid().optional(),
  taskCategory: TaskCategoryEnum.optional(),
  priority: PriorityEnum.optional(),
  taskStatus: TaskStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type OperationalTaskFilterDtoType = z.infer<typeof OperationalTaskFilterDto>;

export const WorkloadQueryDto = z.object({
  hotelId: z.string().uuid(),
});
export type WorkloadQueryDtoType = z.infer<typeof WorkloadQueryDto>;
