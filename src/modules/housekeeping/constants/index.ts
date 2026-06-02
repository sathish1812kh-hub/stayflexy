// FILE: src/modules/housekeeping/constants/index.ts

export const HOUSEKEEPING_ERRORS = {
  TASK_NOT_FOUND: "Housekeeping task not found",
  ROOM_NOT_FOUND: "Room not found or inactive",
  ROOM_DELETED: "Cannot create tasks for a deleted room",
  HOTEL_NOT_FOUND: "Hotel not found or access denied",
  TASK_IMMUTABLE: "Completed or verified tasks cannot be modified",
  INVALID_TRANSITION: "Invalid status transition",
  ALREADY_ASSIGNED: "Task is already assigned",
} as const;

export const VALID_TASK_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["ASSIGNED", "IN_PROGRESS"],
  ASSIGNED: ["IN_PROGRESS", "PENDING"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: ["VERIFIED"],
  VERIFIED: [],
};

export const HOUSEKEEPING_ROOM_STATUS_MAP: Record<string, string> = {
  COMPLETED: "CLEAN",
  VERIFIED: "INSPECTED",
  IN_PROGRESS: "IN_PROGRESS",
};
