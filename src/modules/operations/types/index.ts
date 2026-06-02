export type OperationalTaskCategoryType =
  | "FRONT_DESK"
  | "CONCIERGE"
  | "FOOD_BEVERAGE"
  | "GENERAL"
  | "MAINTENANCE_FOLLOWUP"
  | "GUEST_REQUEST"
  | "ADMINISTRATIVE";

export type OperationalTaskStatusType =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type HousekeepingPriorityType = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface OperationalTask {
  id: string;
  organizationId: string;
  hotelId: string;
  taskTitle: string;
  taskDescription: string | null;
  taskCategory: OperationalTaskCategoryType;
  priority: HousekeepingPriorityType;
  assignedTo: string | null;
  taskStatus: OperationalTaskStatusType;
  dueDate: Date | null;
  completedAt: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OperationalAudit {
  id: string;
  organizationId: string;
  hotelId: string;
  entityType: string;
  entityId: string;
  eventType: string;
  performedBy: string;
  eventMetadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface CreateOperationalTaskData {
  organizationId: string;
  hotelId: string;
  taskTitle: string;
  taskDescription?: string;
  taskCategory: OperationalTaskCategoryType;
  priority?: HousekeepingPriorityType;
  assignedTo?: string;
  dueDate?: Date;
  createdById: string;
}

export interface UpdateOperationalTaskData {
  taskTitle?: string;
  taskDescription?: string;
  taskCategory?: OperationalTaskCategoryType;
  priority?: HousekeepingPriorityType;
  assignedTo?: string | null;
  taskStatus?: OperationalTaskStatusType;
  dueDate?: Date | null;
  completedAt?: Date;
}

export interface OperationalTaskFilter {
  organizationId?: string;
  hotelId?: string;
  assignedTo?: string;
  taskCategory?: OperationalTaskCategoryType;
  priority?: HousekeepingPriorityType;
  taskStatus?: OperationalTaskStatusType;
  page?: number;
  limit?: number;
}

export interface StaffWorkload {
  assignedTo: string;
  pending: number;
  inProgress: number;
  completed: number;
  total: number;
  overdue: number;
}

export interface WorkloadSummary {
  hotelId: string;
  asOf: Date;
  staff: StaffWorkload[];
  unassigned: number;
}
