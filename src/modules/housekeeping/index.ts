// FILE: src/modules/housekeeping/index.ts

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  HousekeepingTask,
  CreateHousekeepingTaskData,
  UpdateHousekeepingTaskData,
  HousekeepingTaskFilter,
  HousekeepingRoomStatus,
  HousekeepingTaskTypeType,
  HousekeepingPriorityType,
  HousekeepingTaskStatusType,
} from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────
export {
  HOUSEKEEPING_ERRORS,
  VALID_TASK_TRANSITIONS,
  HOUSEKEEPING_ROOM_STATUS_MAP,
} from "./constants";

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export {
  CreateHousekeepingTaskDto,
  UpdateHousekeepingTaskDto,
  AssignTaskDto,
  UpdateTaskStatusDto,
  HousekeepingTaskFilterDto,
  RoomStatusFilterDto,
} from "./dto";
export type {
  CreateHousekeepingTaskDtoType,
  UpdateHousekeepingTaskDtoType,
  AssignTaskDtoType,
  UpdateTaskStatusDtoType,
  HousekeepingTaskFilterDtoType,
  RoomStatusFilterDtoType,
} from "./dto";

// ─── Validators ───────────────────────────────────────────────────────────────
export {
  validateCreateHousekeepingTask,
  validateUpdateHousekeepingTask,
  validateAssignTask,
  validateUpdateTaskStatus,
  validateHousekeepingTaskFilter,
  validateRoomStatusFilter,
} from "./validators";

// ─── Repositories ─────────────────────────────────────────────────────────────
export { PrismaHousekeepingTaskRepository } from "./repositories";

// ─── Services ─────────────────────────────────────────────────────────────────
export { HousekeepingService } from "./services";

// ─── Container ────────────────────────────────────────────────────────────────
export { housekeepingService } from "./container";
