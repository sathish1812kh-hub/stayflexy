export const OPERATIONS_ERRORS = {
  TASK_NOT_FOUND: "Operational task not found",
  HOTEL_NOT_FOUND: "Hotel not found or access denied",
  TASK_IMMUTABLE: "Completed or cancelled tasks cannot be modified",
  INVALID_TRANSITION: "Invalid task status transition",
  ACCESS_DENIED: "You do not have access to this task",
} as const;

export const VALID_TASK_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};
